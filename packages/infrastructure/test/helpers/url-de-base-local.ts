import { selectAdapterKind } from "../../src/prisma/create-prisma-client.js";

const URL_LOCAL_POR_DEFECTO = "postgresql://kuorum:kuorum@localhost:54329/kuorum";

// Las pruebas de integración borran datos: solo se permiten contra un Postgres local.
export function exigirUrlLocal(databaseUrl: string): string {
  if (selectAdapterKind(databaseUrl) !== "pg") {
    throw new Error(
      "Las pruebas de integración borran datos y solo corren contra un Postgres local. " +
        "DATABASE_URL apunta a un host remoto: usa la base de compose.yml.",
    );
  }
  return databaseUrl;
}

export function urlDePruebas(): string {
  return exigirUrlLocal(process.env["DATABASE_URL"] ?? URL_LOCAL_POR_DEFECTO);
}
