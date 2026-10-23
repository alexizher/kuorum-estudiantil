-- CreateEnum
CREATE TYPE "TipoDeCuerpo" AS ENUM ('GENERAL', 'FACULTAD');

-- CreateEnum
CREATE TYPE "RolEnCuerpo" AS ENUM ('ENCARGADO', 'MESA');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'MIXTA');

-- CreateTable
CREATE TABLE "institucion" (
    "id" TEXT NOT NULL DEFAULT 'institucion',
    "nombre" TEXT NOT NULL,
    "tipoDeCuerpoSingular" TEXT NOT NULL,
    "tipoDeCuerpoPlural" TEXT NOT NULL,
    "zonaHoraria" TEXT NOT NULL,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuerpos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoDeCuerpo" NOT NULL,
    "slug" TEXT NOT NULL,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuerpos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membresias" (
    "usuarioId" TEXT NOT NULL,
    "cuerpoId" TEXT NOT NULL,
    "rol" "RolEnCuerpo" NOT NULL,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("usuarioId","cuerpoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuerpos_slug_key" ON "cuerpos"("slug");

-- Una sola asamblea general por instalación.
CREATE UNIQUE INDEX "cuerpos_una_general" ON "cuerpos"("tipo") WHERE "tipo" = 'GENERAL';

-- CreateIndex
CREATE INDEX "membresias_cuerpoId_idx" ON "membresias"("cuerpoId");

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_cuerpoId_fkey" FOREIGN KEY ("cuerpoId") REFERENCES "cuerpos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Valores iniciales: el administrador los cambia desde el panel.
INSERT INTO "institucion" ("id", "nombre", "tipoDeCuerpoSingular", "tipoDeCuerpoPlural", "zonaHoraria", "actualizadaEn")
VALUES ('institucion', 'Institución', 'Facultad', 'Facultades', 'America/Bogota', CURRENT_TIMESTAMP);

INSERT INTO "cuerpos" ("id", "nombre", "tipo", "slug")
VALUES ('cuerpo-general', 'Asamblea general', 'GENERAL', 'asamblea-general');

-- AlterTable: las columnas nacen nulas, se llenan con lo que ya había y luego se exigen.
-- Las sesiones existentes pasan a la general, con inicio en su creación y dos horas de duración.
ALTER TABLE "sesiones" ADD COLUMN "cuerpoId" TEXT,
ADD COLUMN "inicio" TIMESTAMP(3),
ADD COLUMN "fin" TIMESTAMP(3),
ADD COLUMN "lugar" TEXT,
ADD COLUMN "modalidad" "Modalidad" NOT NULL DEFAULT 'PRESENCIAL';

UPDATE "sesiones"
SET "cuerpoId" = 'cuerpo-general',
    "inicio" = "creadaEn",
    "fin" = "creadaEn" + interval '2 hours';

ALTER TABLE "sesiones" ALTER COLUMN "cuerpoId" SET NOT NULL,
ALTER COLUMN "inicio" SET NOT NULL,
ALTER COLUMN "fin" SET NOT NULL;

-- CreateIndex
CREATE INDEX "sesiones_inicio_idx" ON "sesiones"("inicio");

-- CreateIndex
CREATE INDEX "sesiones_cuerpoId_inicio_idx" ON "sesiones"("cuerpoId", "inicio");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_cuerpoId_fkey" FOREIGN KEY ("cuerpoId") REFERENCES "cuerpos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las cuentas MESA veían todas las sesiones; ahora sus permisos salen de las membresías.
-- Quedan como encargadas de la general para no perder acceso a lo que ya tenían.
INSERT INTO "membresias" ("usuarioId", "cuerpoId", "rol")
SELECT "id", 'cuerpo-general', 'ENCARGADO' FROM "auth_users" WHERE "rol" = 'MESA';
