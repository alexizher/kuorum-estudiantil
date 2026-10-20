
-- CreateEnum
CREATE TYPE "ModoDeParticipacion" AS ENUM ('SALA_ABIERTA', 'CON_CODIGOS');

-- CreateEnum
CREATE TYPE "CredencialDeParticipante" AS ENUM ('CODIGO', 'NAVEGADOR');

-- CreateEnum
CREATE TYPE "EstadoDePregunta" AS ENUM ('BORRADOR', 'ABIERTA', 'CERRADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoDeSolicitud" AS ENUM ('ESPERANDO', 'CON_LA_PALABRA', 'TERMINADA', 'RETIRADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoDeSolicitud" AS ENUM ('INTERVENCION', 'MOCION');

-- CreateEnum
CREATE TYPE "TipoDeMocion" AS ENUM ('ORDEN', 'PROCEDIMIENTO', 'ACLARACION', 'SUFICIENTE_ILUSTRACION');

-- AlterTable
-- Las sesiones de la fase 0 (pruebas de carga) no tenían título ni código de sala:
-- se les da un título fijo y un código aleatorio del alfabeto del dominio.
ALTER TABLE "sesiones" ADD COLUMN     "codigoDeSala" TEXT,
ADD COLUMN     "modo" "ModoDeParticipacion" NOT NULL DEFAULT 'SALA_ABIERTA',
ADD COLUMN     "segundosPorIntervencion" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "titulo" TEXT NOT NULL DEFAULT 'Sesión de prueba';

ALTER TABLE "sesiones" ALTER COLUMN "titulo" DROP DEFAULT;

DO $$
DECLARE
    fila RECORD;
    alfabeto CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    candidato TEXT;
BEGIN
    FOR fila IN SELECT "id" FROM "sesiones" WHERE "codigoDeSala" IS NULL LOOP
        LOOP
            candidato := '';
            FOR i IN 1..4 LOOP
                candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
            END LOOP;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM "sesiones" WHERE "codigoDeSala" = candidato);
        END LOOP;
        UPDATE "sesiones" SET "codigoDeSala" = candidato WHERE "id" = fila."id";
    END LOOP;
END $$;

ALTER TABLE "sesiones" ALTER COLUMN "codigoDeSala" SET NOT NULL;

-- CreateTable
CREATE TABLE "participantes" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "credencial" "CredencialDeParticipante" NOT NULL,
    "hash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_de_acceso" (
    "sesionId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "activadoEn" TIMESTAMP(3),

    CONSTRAINT "codigos_de_acceso_pkey" PRIMARY KEY ("sesionId","hash")
);

-- CreateTable
CREATE TABLE "preguntas" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "estado" "EstadoDePregunta" NOT NULL DEFAULT 'BORRADOR',
    "resultadoVisible" BOOLEAN NOT NULL DEFAULT false,
    "abiertaEn" TIMESTAMP(3),
    "cerradaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "opciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos_emitidos" (
    "preguntaId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,

    CONSTRAINT "votos_emitidos_pkey" PRIMARY KEY ("preguntaId","participanteId")
);

-- CreateTable
CREATE TABLE "conteos" (
    "preguntaId" TEXT NOT NULL,
    "opcionId" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conteos_pkey" PRIMARY KEY ("preguntaId","opcionId")
);

-- CreateTable
CREATE TABLE "solicitudes_de_palabra" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "nombreVisible" TEXT NOT NULL,
    "tipo" "TipoDeSolicitud" NOT NULL,
    "mocion" "TipoDeMocion",
    "estado" "EstadoDeSolicitud" NOT NULL DEFAULT 'ESPERANDO',
    "pedidaEn" TIMESTAMP(3) NOT NULL,
    "inicioEn" TIMESTAMP(3),
    "finEn" TIMESTAMP(3),
    "segundosExtra" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "solicitudes_de_palabra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participantes_sesionId_hash_key" ON "participantes"("sesionId", "hash");

-- CreateIndex
CREATE INDEX "preguntas_sesionId_idx" ON "preguntas"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_preguntaId_orden_key" ON "opciones"("preguntaId", "orden");

-- CreateIndex
CREATE INDEX "solicitudes_de_palabra_sesionId_estado_idx" ON "solicitudes_de_palabra"("sesionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_codigoDeSala_key" ON "sesiones"("codigoDeSala");

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_de_acceso" ADD CONSTRAINT "codigos_de_acceso_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas" ADD CONSTRAINT "preguntas_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones" ADD CONSTRAINT "opciones_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_emitidos" ADD CONSTRAINT "votos_emitidos_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos" ADD CONSTRAINT "conteos_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos" ADD CONSTRAINT "conteos_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_de_palabra" ADD CONSTRAINT "solicitudes_de_palabra_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_de_palabra" ADD CONSTRAINT "solicitudes_de_palabra_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Una sola pregunta ABIERTA por sesión. Prisma no expresa índices parciales.
CREATE UNIQUE INDEX "preguntas_una_abierta_por_sesion" ON "preguntas"("sesionId") WHERE "estado" = 'ABIERTA';
