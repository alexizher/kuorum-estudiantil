import { randomInt } from "node:crypto";
import { ErrorDeDominio, type RegistroDeVotos } from "@kuorum/domain";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";
import { FRAGMENTOS_DE_CONTEO } from "./fragmentos.js";

interface Diagnostico {
  existe: boolean;
  estado: string | null;
  opcionValida: boolean;
  insertado: boolean;
}

/**
 * El voto secreto vive en dos tablas sin relación entre sí: `votos_emitidos` (quién ya
 * votó, sin hora ni opción) y `conteos` (cuántos votos tiene cada opción, en fragmentos).
 */
export class PrismaRegistroDeVotos implements RegistroDeVotos {
  constructor(private readonly contexto: ContextoTransaccional) {}

  /**
   * Una sola sentencia, un solo viaje a la base y sin transacción interactiva:
   * - FOR SHARE sobre la pregunta: los votos no se bloquean entre sí, pero el cierre
   *   (FOR UPDATE) espera a los que están en vuelo y los que llegan después ven CERRADA.
   * - Suma en un fragmento al azar. Actualiza TODAS las opciones de ese fragmento
   *   (`total + (opcion = elegida)::int`), así las filas tocadas comparten el xmin del
   *   votante sea cual sea la opción y el xmin no delata por quién votó.
   */
  async emitir(preguntaId: string, participanteId: string, opcionId: string): Promise<void> {
    const fragmento = randomInt(FRAGMENTOS_DE_CONTEO);
    const filas = await this.contexto.cliente().$queryRaw<Diagnostico[]>`
      WITH p AS (
        SELECT "estado"::text AS "estado" FROM "preguntas" WHERE "id" = ${preguntaId} FOR SHARE
      ),
      o AS (
        SELECT 1 FROM "opciones" WHERE "id" = ${opcionId} AND "preguntaId" = ${preguntaId}
      ),
      ins AS (
        INSERT INTO "votos_emitidos" ("preguntaId", "participanteId")
        SELECT ${preguntaId}, ${participanteId}
        WHERE EXISTS (SELECT 1 FROM p WHERE "estado" = 'ABIERTA') AND EXISTS (SELECT 1 FROM o)
        ON CONFLICT DO NOTHING
        RETURNING 1
      ),
      upd AS (
        UPDATE "conteos" SET "total" = "total" + ("opcionId" = ${opcionId})::int
        WHERE "preguntaId" = ${preguntaId} AND "shard" = ${fragmento}::smallint
          AND EXISTS (SELECT 1 FROM ins)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM p) AS "existe",
             (SELECT "estado" FROM p) AS "estado",
             EXISTS (SELECT 1 FROM o) AS "opcionValida",
             EXISTS (SELECT 1 FROM ins) AS "insertado"`;
    const d = filas[0];
    if (d === undefined || !d.existe) throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
    if (d.estado !== "ABIERTA") throw new ErrorDeDominio("PREGUNTA_CERRADA");
    if (!d.opcionValida) throw new ErrorDeDominio("OPCION_INVALIDA");
    if (!d.insertado) throw new ErrorDeDominio("YA_VOTO");
  }

  async conteos(preguntaId: string): Promise<Map<string, number>> {
    const filas = await this.contexto.cliente().conteo.groupBy({
      by: ["opcionId"],
      where: { preguntaId },
      _sum: { total: true },
    });
    return new Map(filas.map((f) => [f.opcionId, f._sum.total ?? 0]));
  }

  votosEmitidos(preguntaId: string): Promise<number> {
    return this.contexto.cliente().votoEmitido.count({ where: { preguntaId } });
  }
}
