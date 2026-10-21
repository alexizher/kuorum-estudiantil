-- Conteos repartidos en 16 fragmentos por opción: los votos simultáneos eligen un fragmento
-- al azar y no se serializan sobre una sola fila.
ALTER TABLE "conteos" ADD COLUMN "shard" SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE "conteos" ALTER COLUMN "shard" DROP DEFAULT;
ALTER TABLE "conteos" ADD CONSTRAINT "conteos_shard_rango" CHECK ("shard" BETWEEN 0 AND 15);

ALTER TABLE "conteos" DROP CONSTRAINT "conteos_pkey";
ALTER TABLE "conteos" ADD CONSTRAINT "conteos_pkey" PRIMARY KEY ("preguntaId", "opcionId", "shard");

-- Las preguntas ya abiertas necesitan los otros 15 fragmentos en 0.
INSERT INTO "conteos" ("preguntaId", "opcionId", "shard", "total")
SELECT c."preguntaId", c."opcionId", s.n, 0
FROM "conteos" c CROSS JOIN generate_series(1, 15) AS s(n)
WHERE c."shard" = 0
ON CONFLICT DO NOTHING;
