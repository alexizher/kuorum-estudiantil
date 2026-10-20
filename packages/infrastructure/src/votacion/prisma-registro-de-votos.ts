import { ErrorDeDominio, type RegistroDeVotos } from "@kuorum/domain";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

/**
 * El voto secreto vive en dos tablas sin relación entre sí: `votos_emitidos` (quién ya
 * votó, sin hora ni opción) y `conteos` (cuántos votos tiene cada opción).
 */
export class PrismaRegistroDeVotos implements RegistroDeVotos {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async emitir(preguntaId: string, participanteId: string, opcionId: string): Promise<void> {
    await this.contexto.enTransaccion(async (tx) => {
      // El mismo candado que toma el cierre: o el voto entra antes, o ve la pregunta cerrada.
      const filas = await tx.$queryRaw<{ estado: string }[]>`
        SELECT "estado"::text AS "estado" FROM "preguntas" WHERE "id" = ${preguntaId} FOR UPDATE`;
      const pregunta = filas[0];
      if (pregunta === undefined) throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
      if (pregunta.estado !== "ABIERTA") throw new ErrorDeDominio("PREGUNTA_CERRADA");

      // ON CONFLICT en vez de capturar el error: una violación abortaría la transacción
      // externa si hay una unidad de trabajo en curso.
      const insertados = await tx.$executeRaw`
        INSERT INTO "votos_emitidos" ("preguntaId", "participanteId")
        VALUES (${preguntaId}, ${participanteId})
        ON CONFLICT DO NOTHING`;
      if (insertados === 0) throw new ErrorDeDominio("YA_VOTO");

      const sumados = await tx.$executeRaw`
        UPDATE "conteos" SET "total" = "total" + 1
        WHERE "preguntaId" = ${preguntaId} AND "opcionId" = ${opcionId}`;
      if (sumados === 0) throw new ErrorDeDominio("OPCION_INVALIDA");
    });
  }

  async conteos(preguntaId: string): Promise<Map<string, number>> {
    const filas = await this.contexto.cliente().conteo.findMany({ where: { preguntaId } });
    return new Map(filas.map((f) => [f.opcionId, f.total]));
  }

  votosEmitidos(preguntaId: string): Promise<number> {
    return this.contexto.cliente().votoEmitido.count({ where: { preguntaId } });
  }
}
