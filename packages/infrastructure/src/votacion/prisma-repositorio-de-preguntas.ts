import { ErrorDeDominio, Opcion, Pregunta } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "@kuorum/application";
import type {
  Opcion as FilaDeOpcion,
  Pregunta as FilaDePregunta,
} from "../generated/prisma/client.js";
import {
  esViolacionDeUnico,
  type ContextoTransaccional,
} from "../prisma/contexto-transaccional.js";

type FilaConOpciones = FilaDePregunta & { opciones: FilaDeOpcion[] };

const CON_OPCIONES = { opciones: { orderBy: { orden: "asc" as const } } };

function aDominio(fila: FilaConOpciones): Pregunta {
  return Pregunta.reconstruir({
    id: fila.id,
    sesionId: fila.sesionId,
    texto: fila.texto,
    opciones: fila.opciones.map((o) => new Opcion(o.id, o.texto, o.orden)),
    estado: fila.estado,
    abiertaEn: fila.abiertaEn,
    cerradaEn: fila.cerradaEn,
    resultadoVisible: fila.resultadoVisible,
  });
}

export class PrismaRepositorioDePreguntas implements RepositorioDePreguntas {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<Pregunta | null> {
    const fila = await this.contexto
      .cliente()
      .pregunta.findUnique({ where: { id }, include: CON_OPCIONES });
    return fila === null ? null : aDominio(fila);
  }

  async deSesion(sesionId: string): Promise<Pregunta[]> {
    const filas = await this.contexto.cliente().pregunta.findMany({
      where: { sesionId },
      include: CON_OPCIONES,
      orderBy: [{ creadaEn: "asc" }, { id: "asc" }],
    });
    return filas.map(aDominio);
  }

  async abiertaDeSesion(sesionId: string): Promise<Pregunta | null> {
    const fila = await this.contexto
      .cliente()
      .pregunta.findFirst({ where: { sesionId, estado: "ABIERTA" }, include: CON_OPCIONES });
    return fila === null ? null : aDominio(fila);
  }

  /**
   * Toma el candado de la fila antes de escribir: un voto en vuelo (que tiene el mismo
   * candado) termina antes de que el cambio de estado se aplique, y los votos posteriores
   * ven CERRADA. Los conteos se crean en 0 al guardarla ABIERTA (sin pisar los existentes).
   * La segunda ABIERTA de una sesión la rechaza el índice único parcial.
   */
  async guardar(pregunta: Pregunta): Promise<void> {
    try {
      await this.contexto.enTransaccion(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "preguntas" WHERE "id" = ${pregunta.id} FOR UPDATE`;
        const datos = {
          estado: pregunta.estado,
          resultadoVisible: pregunta.resultadoVisible,
          abiertaEn: pregunta.abiertaEn,
          cerradaEn: pregunta.cerradaEn,
        };
        await tx.pregunta.upsert({
          where: { id: pregunta.id },
          create: {
            id: pregunta.id,
            sesionId: pregunta.sesionId,
            texto: pregunta.texto,
            ...datos,
          },
          update: datos,
        });
        await tx.opcion.createMany({
          data: pregunta.opciones.map((o) => ({
            id: o.id,
            preguntaId: pregunta.id,
            texto: o.texto,
            orden: o.orden,
          })),
          skipDuplicates: true,
        });
        if (pregunta.estado === "ABIERTA") {
          await tx.conteo.createMany({
            data: pregunta.opciones.map((o) => ({
              preguntaId: pregunta.id,
              opcionId: o.id,
              total: 0,
            })),
            skipDuplicates: true,
          });
        }
      });
    } catch (error) {
      if (pregunta.estado === "ABIERTA" && esViolacionDeUnico(error)) {
        throw new ErrorDeDominio("OTRA_PREGUNTA_ABIERTA");
      }
      throw error;
    }
  }
}
