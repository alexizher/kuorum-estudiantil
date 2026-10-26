import { defineConfig } from "prisma/config";
import { urlDePrisma } from "./src/prisma/url-de-prisma.js";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: urlDePrisma(process.env, process.argv) },
});
