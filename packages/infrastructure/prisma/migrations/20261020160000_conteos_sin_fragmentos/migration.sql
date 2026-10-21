-- Se quitan los fragmentos: con un solo voto en un fragmento, el xmin de la fila de conteo
-- coincidía con el de votos_emitidos y delataba el voto. Cada voto actualiza ahora todas las
-- opciones de la pregunta, así las filas vivas comparten el xmin del último votante.
UPDATE "conteos" c
SET "total" = s."suma"
FROM (
    SELECT "preguntaId", "opcionId", SUM("total")::int AS "suma"
    FROM "conteos"
    GROUP BY "preguntaId", "opcionId"
) s
WHERE c."preguntaId" = s."preguntaId" AND c."opcionId" = s."opcionId" AND c."shard" = 0;

DELETE FROM "conteos" WHERE "shard" <> 0;

ALTER TABLE "conteos" DROP CONSTRAINT "conteos_shard_rango";
ALTER TABLE "conteos" DROP CONSTRAINT "conteos_pkey";
ALTER TABLE "conteos" DROP COLUMN "shard";
ALTER TABLE "conteos" ADD CONSTRAINT "conteos_pkey" PRIMARY KEY ("preguntaId", "opcionId");
