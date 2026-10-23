import { Decision, ErrorDeDominio, type FotoDeResultado } from "@kuorum/domain";
import type { FiltroPublico, RepositorioDeDecisiones } from "@kuorum/application";
import type { Prisma, Decision as FilaDeDecision } from "../generated/prisma/client.js";
import {
  esViolacionDeUnico,
  type ContextoTransaccional,
} from "../prisma/contexto-transaccional.js";

function reglaValida(regla: string): "MAYORIA_SIMPLE" {
  if (regla !== "MAYORIA_SIMPLE") throw new ErrorDeDominio("REGLA_DESCONOCIDA");
  return regla;
}

function aDominio(fila: FilaDeDecision): Decision {
  return Decision.reconstruir({
    id: fila.id,
    preguntaId: fila.preguntaId,
    sesionId: fila.sesionId,
    cuerpoId: fila.cuerpoId,
    pregunta: fila.pregunta,
    regla: reglaValida(fila.regla),
    resultado: fila.resultado as unknown as FotoDeResultado,
    aprobada: fila.aprobada,
    indicativa: fila.indicativa,
    enunciado: fila.enunciado,
    consultaId: fila.consultaId,
    cerradaEn: fila.cerradaEn,
  });
}

export class PrismaRepositorioDeDecisiones implements RepositorioDeDecisiones {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async guardar(decision: Decision): Promise<void> {
    const cliente = this.contexto.cliente();
    const existente = await cliente.decision.findUnique({
      where: { preguntaId: decision.preguntaId },
      select: { id: true },
    });
    // Se comprueba antes de crear: capturar la violación de único abortaría la transacción.
    if (existente !== null && existente.id !== decision.id) {
      throw new ErrorDeDominio("DECISION_REPETIDA");
    }
    const datos = {
      sesionId: decision.sesionId,
      cuerpoId: decision.cuerpoId,
      pregunta: decision.pregunta,
      regla: decision.regla,
      resultado: decision.resultado as unknown as Prisma.InputJsonValue,
      aprobada: decision.aprobada,
      indicativa: decision.indicativa,
      enunciado: decision.enunciado,
      consultaId: decision.consultaId,
      cerradaEn: decision.cerradaEn,
    };
    try {
      await cliente.decision.upsert({
        where: { id: decision.id },
        create: { id: decision.id, preguntaId: decision.preguntaId, ...datos },
        update: datos,
      });
    } catch (error) {
      // Otro cierre la insertó sin confirmar todavía cuando se comprobó.
      if (esViolacionDeUnico(error)) throw new ErrorDeDominio("DECISION_REPETIDA");
      throw error;
    }
  }

  async eliminarDePregunta(preguntaId: string): Promise<void> {
    await this.contexto.cliente().decision.deleteMany({ where: { preguntaId } });
  }

  async deSesion(sesionId: string): Promise<Decision[]> {
    const filas = await this.contexto.cliente().decision.findMany({
      where: { sesionId },
      orderBy: [{ cerradaEn: "asc" }, { id: "asc" }],
    });
    return filas.map(aDominio);
  }

  async porId(id: string): Promise<Decision | null> {
    const fila = await this.contexto.cliente().decision.findUnique({ where: { id } });
    return fila === null ? null : aDominio(fila);
  }

  async publicas(filtro: FiltroPublico): Promise<Decision[]> {
    const filas = await this.contexto.cliente().decision.findMany({
      where: {
        cerradaEn: { gte: filtro.desde, lt: filtro.hasta },
        ...(filtro.cuerpoId === undefined ? {} : { cuerpoId: filtro.cuerpoId }),
        sesion: {
          estado: "ACTA_FINAL",
          OR: [{ creadaPorId: null }, { creadaPor: { rol: { not: "DEMO" } } }],
        },
      },
      orderBy: [{ cerradaEn: "asc" }, { id: "asc" }],
    });
    return filas.map(aDominio);
  }
}
