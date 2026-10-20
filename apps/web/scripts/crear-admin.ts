import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { LARGO_MINIMO_DE_CONTRASENA, type DatosDeCuenta } from "../src/auth/crear-cuenta";

export interface DependenciasDeCrearAdmin {
  leerStdin: () => Promise<string>;
  stdout: (texto: string) => void;
  stderr: (texto: string) => void;
  crearCuenta: (datos: DatosDeCuenta) => Promise<void>;
}

const USO = `Uso: pnpm --filter @kuorum/web crear-admin --correo <correo> --nombre <nombre> [--generar]

  Sin --generar, lee la contraseña de stdin (mínimo ${LARGO_MINIMO_DE_CONTRASENA} caracteres).
  Con --generar, crea una contraseña fuerte y la imprime una sola vez por stdout.
`;

// Nunca escribe la contraseña recibida por stdin; la generada va solo a stdout y solo si la cuenta se creó.
export async function ejecutarCrearAdmin(
  argv: string[],
  deps: DependenciasDeCrearAdmin,
): Promise<number> {
  let valores: {
    correo?: string | undefined;
    nombre?: string | undefined;
    generar?: boolean | undefined;
  };
  try {
    valores = parseArgs({
      args: argv.filter((arg) => arg !== "--"),
      options: {
        correo: { type: "string" },
        nombre: { type: "string" },
        generar: { type: "boolean" },
      },
    }).values;
  } catch {
    deps.stderr(USO);
    return 2;
  }
  const { correo, nombre, generar } = valores;
  if (!correo || !nombre) {
    deps.stderr(USO);
    return 2;
  }
  const contrasena = generar
    ? randomBytes(18).toString("base64url")
    : (await deps.leerStdin()).replace(/\r?\n$/, "");
  if (contrasena.length < LARGO_MINIMO_DE_CONTRASENA) {
    deps.stderr(`La contraseña debe tener al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.\n`);
    return 1;
  }
  try {
    await deps.crearCuenta({ correo, nombre, contrasena });
  } catch (error) {
    deps.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  if (generar) deps.stdout(`${contrasena}\n`);
  deps.stderr(`Cuenta creada para ${correo}.\n`);
  return 0;
}

async function leerStdin(): Promise<string> {
  const trozos: Buffer[] = [];
  for await (const trozo of process.stdin) trozos.push(trozo as Buffer);
  return Buffer.concat(trozos).toString("utf8");
}

async function principal(): Promise<number> {
  // Import dinámico: las pruebas importan este archivo sin tocar la base ni el entorno.
  const { contenedor } = await import("../src/composicion");
  const { crearCuentaDeMesa } = await import("../src/auth/crear-cuenta");
  return ejecutarCrearAdmin(process.argv.slice(2), {
    leerStdin,
    stdout: (texto) => process.stdout.write(texto),
    stderr: (texto) => process.stderr.write(texto),
    crearCuenta: (datos) => crearCuentaDeMesa(contenedor().autenticacion(), datos),
  });
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  process.exit(
    await principal().catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }),
  );
}
