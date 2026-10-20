import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Las migraciones solo corren en builds de producción; las vistas previas nunca migran. */
export function migrarSiProduccion({ env, ejecutar }) {
  if (env.VERCEL_ENV !== "production") {
    return {
      codigo: 0,
      mensaje: `VERCEL_ENV=${env.VERCEL_ENV ?? "(sin definir)"}: no se migra la base de datos.`,
    };
  }
  const codigo = ejecutar();
  return { codigo, mensaje: codigo === 0 ? "Migraciones aplicadas." : "Falló la migración." };
}

function migrar() {
  const resultado = spawnSync("pnpm", ["--filter", "@kuorum/infrastructure", "db:deploy"], {
    stdio: "inherit",
  });
  return resultado.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { codigo, mensaje } = migrarSiProduccion({ env: process.env, ejecutar: migrar });
  console.log(mensaje);
  process.exit(codigo);
}
