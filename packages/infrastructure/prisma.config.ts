import { defineConfig } from "prisma/config";

// Las migraciones usan la conexión directa (sin pooler); el runtime usa DATABASE_URL.
const url = process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"] ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
