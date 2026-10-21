-- CreateEnum
CREATE TYPE "RolDeMesa" AS ENUM ('SUPERADMIN', 'MESA', 'DEMO');

-- AlterTable: las cuentas que ya existen eran de quien montó la instalación, así que pasan a
-- SUPERADMIN. Las que se creen después y no digan rol quedan como MESA.
ALTER TABLE "auth_users" ADD COLUMN "rol" "RolDeMesa" NOT NULL DEFAULT 'SUPERADMIN';
ALTER TABLE "auth_users" ALTER COLUMN "rol" SET DEFAULT 'MESA';

-- AlterTable
ALTER TABLE "sesiones" ADD COLUMN "creadaPorId" TEXT;

-- CreateIndex
CREATE INDEX "sesiones_creadaPorId_idx" ON "sesiones"("creadaPorId");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Las sesiones que ya existen pasan a la primera cuenta SUPERADMIN. Sin cuentas, quedan sin dueño.
UPDATE "sesiones"
SET "creadaPorId" = (
  SELECT "id" FROM "auth_users" WHERE "rol" = 'SUPERADMIN' ORDER BY "createdAt", "id" LIMIT 1
)
WHERE "creadaPorId" IS NULL;
