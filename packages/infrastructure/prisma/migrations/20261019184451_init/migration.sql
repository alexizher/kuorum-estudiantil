-- CreateEnum
CREATE TYPE "EstadoDeSesion" AS ENUM ('PROGRAMADA', 'ABIERTA', 'EN_CURSO', 'CERRADA', 'ACTA_FINAL', 'CANCELADA');

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "estado" "EstadoDeSesion" NOT NULL DEFAULT 'PROGRAMADA',
    "version" INTEGER NOT NULL DEFAULT 0,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);
