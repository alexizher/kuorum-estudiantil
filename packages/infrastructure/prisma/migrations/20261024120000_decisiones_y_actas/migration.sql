-- CreateEnum
CREATE TYPE "EstadoDeActa" AS ENUM ('BORRADOR', 'FINAL');

-- AlterTable
ALTER TABLE "sesiones" ADD COLUMN     "ordenDelDia" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "decisiones" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "cuerpoId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "regla" TEXT NOT NULL,
    "resultado" JSONB NOT NULL,
    "aprobada" BOOLEAN,
    "indicativa" BOOLEAN NOT NULL,
    "enunciado" TEXT,
    "consultaId" TEXT,
    "cerradaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actas" (
    "sesionId" TEXT NOT NULL,
    "desarrollo" TEXT NOT NULL DEFAULT '',
    "estado" "EstadoDeActa" NOT NULL DEFAULT 'BORRADOR',
    "codigo" TEXT,
    "finalizadaEn" TIMESTAMP(3),
    "contenido" JSONB,

    CONSTRAINT "actas_pkey" PRIMARY KEY ("sesionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "decisiones_preguntaId_key" ON "decisiones"("preguntaId");

-- CreateIndex
CREATE INDEX "decisiones_cuerpoId_cerradaEn_idx" ON "decisiones"("cuerpoId", "cerradaEn");

-- CreateIndex
CREATE INDEX "decisiones_sesionId_idx" ON "decisiones"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "actas_codigo_key" ON "actas"("codigo");

-- AddForeignKey
ALTER TABLE "decisiones" ADD CONSTRAINT "decisiones_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actas" ADD CONSTRAINT "actas_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
