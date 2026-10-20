import { ErrorDeDominio, type RegistroDeVotos } from "@kuorum/domain";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

interface Diagnostico {
  existe: boolean;
  estado: string | null;
  opcionValida: boolean;
  conteosCompletos: boolean;
  insertado: boolean;
  actualizado: boolean;
}

/**
 * El voto secreto vive en dos tablas sin relación entre sí: `votos_emitidos` (quién ya
 * votó, sin hora ni opción) y `conteos` (cuántos votos tiene cada opción).
 */
export class PrismaRegistroDeVotos implements RegistroDeVotos {
  constructor(private readonly contexto: ContextoTransaccional) {}

  /**
   * Una sola sentencia, un solo viaje a la base y sin transacción interactiva:
   * - FOR SHARE sobre la pregunta: el cierre (FOR UPDATE) espera a los votos en vuelo y
   *   los que llegan después ven CERRADA.
   * - Bloquea las filas de conteo de la pregunta en orden de opción (sin interbloqueos)
   *   y actualiza TODAS con `total + (opcion = elegida)::int`: las filas vivas comparten
   *   el xmin del último votante sea cual sea su opción, y ninguna fila queda marcada
   *   con el xmin de un votante concreto y una sola opción.
   * - El INSERT del voto solo ocurre si están todas las filas de conteo: nunca queda un
   *   voto registrado sin sumarse.
   */
  async emitir(preguntaId: string, participanteId: string, opcionId: string): Promise<void> {
    const filas = await this.contexto.cliente().$queryRaw<Diagnostico[]>`
      WITH p AS (
        SELECT "estado"::text AS "estado" FROM "preguntas" WHERE "id" = ${preguntaId} FOR SHARE
      ),
      o AS (
        SELECT 1 FROM "opciones" WHERE "id" = ${opcionId} AND "preguntaId" = ${preguntaId}
      ),
      c AS (
        SELECT "opcionId" FROM "conteos"
        WHERE "preguntaId" = ${preguntaId} AND EXISTS (SELECT 1 FROM p WHERE "estado" = 'ABIERTA')
        ORDER BY "opcionId"
        FOR UPDATE
      ),
      completos AS (
        SELECT (SELECT count(*) FROM c) > 0
           AND (SELECT count(*) FROM c) = (SELECT count(*) FROM "opciones" WHERE "preguntaId" = ${preguntaId})
           AS "ok"
      ),
      ins AS (
        INSERT INTO "votos_emitidos" ("preguntaId", "participanteId")
        SELECT ${preguntaId}, ${participanteId}
        WHERE EXISTS (SELECT 1 FROM p WHERE "estado" = 'ABIERTA')
          AND EXISTS (SELECT 1 FROM o)
          AND (SELECT "ok" FROM completos)
        ON CONFLICT DO NOTHING
        RETURNING 1
      ),
      upd AS (
        UPDATE "conteos" SET "total" = "total" + ("opcionId" = ${opcionId})::int
        WHERE "preguntaId" = ${preguntaId} AND EXISTS (SELECT 1 FROM ins)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM p) AS "existe",
             (SELECT "estado" FROM p) AS "estado",
             EXISTS (SELECT 1 FROM o) AS "opcionValida",
             (SELECT "ok" FROM completos) AS "conteosCompletos",
             EXISTS (SELECT 1 FROM ins) AS "insertado",
             EXISTS (SELECT 1 FROM upd) AS "actualizado"`;
    const d = filas[0];
    if (d === undefined || !d.existe) throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
    if (d.estado !== "ABIERTA") throw new ErrorDeDominio("PREGUNTA_CERRADA");
    if (!d.opcionValida) throw new ErrorDeDominio("OPCION_INVALIDA");
    if (!d.conteosCompletos) throw new ErrorDeDominio("CONTEO_FALTANTE");
    if (!d.insertado) throw new ErrorDeDominio("YA_VOTO");
    // No debería pasar (el INSERT depende de que existan las filas); si pasara dentro de
    // una unidad de trabajo, esta excepción la revierte.
    if (!d.actualizado) throw new ErrorDeDominio("CONTEO_FALTANTE");
  }

  async conteos(preguntaId: string): Promise<Map<string, number>> {
    const filas = await this.contexto.cliente().conteo.findMany({ where: { preguntaId } });
    return new Map(filas.map((f) => [f.opcionId, f.total]));
  }

  votosEmitidos(preguntaId: string): Promise<number> {
    return this.contexto.cliente().votoEmitido.count({ where: { preguntaId } });
  }
}
