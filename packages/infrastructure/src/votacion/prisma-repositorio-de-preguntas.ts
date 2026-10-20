import { ErrorDeDominio, Opcion, Pregunta } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "@kuorum/application";
import type {
  Opcion as FilaDeOpcion,
  Pregunta as FilaDePregunta,
} from "../generated/prisma/client.js";
import {
  esFalloDeCandado,
  esViolacionDeUnico,
  type ClienteTransaccional,
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

export interface OpcionesDeCierre {
  esperaDeCandadoMs: number;
  intentosDeCierre: number;
}

const OPCIONES_POR_DEFECTO: OpcionesDeCierre = { esperaDeCandadoMs: 5000, intentosDeCierre: 3 };

export class PrismaRepositorioDePreguntas implements RepositorioDePreguntas {
  constructor(
    private readonly contexto: ContextoTransaccional,
    private readonly opciones: OpcionesDeCierre = OPCIONES_POR_DEFECTO,
  ) {}

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
   * Cerrar o anular toma FOR UPDATE de la fila: espera a los votos en vuelo (que tienen
   * FOR SHARE) y los que lleguen después ven la pregunta cerrada. Con lock_timeout y
   * reintentos para que una ráfaga de votos no lo deje esperando para siempre; si no
   * se logra, CIERRE_OCUPADO. Dentro de una unidad de trabajo ajena no se puede
   * reintentar (la transacción queda abortada): falla a la primera y la unidad se revierte.
   * Los conteos se crean en 0 (una fila por opción) al guardarla ABIERTA, sin pisar
   * los existentes. La segunda ABIERTA de una sesión la rechaza el índice único parcial.
   */
  async guardar(pregunta: Pregunta): Promise<void> {
    const cierra = pregunta.estado === "CERRADA" || pregunta.estado === "ANULADA";
    const intentos = cierra && !this.contexto.hayTransaccion() ? this.opciones.intentosDeCierre : 1;
    for (let intento = 1; ; intento += 1) {
      try {
        await this.contexto.enTransaccion((tx) => this.escribir(tx, pregunta, cierra));
        return;
      } catch (error) {
        if (esFalloDeCandado(error)) {
          if (intento < intentos) continue;
          throw new ErrorDeDominio(
            "CIERRE_OCUPADO",
            "Hay votos entrando, intenta cerrar de nuevo en unos segundos",
          );
        }
        if (pregunta.estado === "ABIERTA" && esViolacionDeUnico(error)) {
          throw new ErrorDeDominio("OTRA_PREGUNTA_ABIERTA");
        }
        throw error;
      }
    }
  }

  private async escribir(
    tx: ClienteTransaccional,
    pregunta: Pregunta,
    cierra: boolean,
  ): Promise<void> {
    if (cierra) {
      const previo = await tx.$queryRaw<{ valor: string }[]>`
        SELECT current_setting('lock_timeout') AS "valor"`;
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${`${this.opciones.esperaDeCandadoMs}ms`}, true)`;
      await tx.$queryRaw`SELECT "id" FROM "preguntas" WHERE "id" = ${pregunta.id} FOR UPDATE`;
      // El candado ya está tomado: se devuelve el valor para no afectar a la unidad externa.
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${previo[0]?.valor ?? "0"}, true)`;
    }
    const datos = {
      estado: pregunta.estado,
      resultadoVisible: pregunta.resultadoVisible,
      abiertaEn: pregunta.abiertaEn,
      cerradaEn: pregunta.cerradaEn,
    };
    await tx.pregunta.upsert({
      where: { id: pregunta.id },
      create: { id: pregunta.id, sesionId: pregunta.sesionId, texto: pregunta.texto, ...datos },
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
  }
}
