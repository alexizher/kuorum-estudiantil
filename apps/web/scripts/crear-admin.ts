import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import type { RolDeMesa } from "@kuorum/application";
import { LARGO_MINIMO_DE_CONTRASENA, type DatosDeCuenta } from "../src/auth/crear-cuenta";

export interface DependenciasDeCrearAdmin {
  leerStdin: () => Promise<string>;
  stdout: (texto: string) => void;
  stderr: (texto: string) => void;
  crearCuenta: (datos: DatosDeCuenta) => Promise<void>;
  /** Cambia la contraseña y el rol de una cuenta existente. */
  actualizarCuenta: (datos: DatosDeCuenta) => Promise<void>;
}

const ROLES: readonly RolDeMesa[] = ["SUPERADMIN", "MESA", "DEMO"];

const USO = `Uso: pnpm --filter @kuorum/web crear-admin --correo <correo> --nombre <nombre> [--rol SUPERADMIN|MESA|DEMO] [--generar] [--actualizar]

  --rol: SUPERADMIN (por defecto) y MESA ven todas las sesiones. DEMO es la cuenta de prueba
  pública y solo ve las sesiones que crea.

  --actualizar: la cuenta ya existe; cambia su contraseña y su rol y cierra sus sesiones.

  Sin --generar, lee la contraseña de stdin (mínimo ${LARGO_MINIMO_DE_CONTRASENA} caracteres).
  Con --generar, crea una contraseña fuerte y la imprime una sola vez por stdout.
`;

function esRol(valor: string): valor is RolDeMesa {
  return ROLES.some((rol) => rol === valor);
}

// Nunca escribe la contraseña recibida por stdin; la generada va solo a stdout y solo si la cuenta se creó.
export async function ejecutarCrearAdmin(
  argv: string[],
  deps: DependenciasDeCrearAdmin,
): Promise<number> {
  let valores: {
    correo?: string | undefined;
    nombre?: string | undefined;
    generar?: boolean | undefined;
    rol?: string | undefined;
    actualizar?: boolean | undefined;
  };
  try {
    valores = parseArgs({
      args: argv.filter((arg) => arg !== "--"),
      options: {
        correo: { type: "string" },
        nombre: { type: "string" },
        generar: { type: "boolean" },
        rol: { type: "string" },
        actualizar: { type: "boolean" },
      },
    }).values;
  } catch {
    deps.stderr(USO);
    return 2;
  }
  const { correo, nombre, generar } = valores;
  const rol = valores.rol ?? "SUPERADMIN";
  if (!correo || !nombre || !esRol(rol)) {
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
    const datos = { correo, nombre, contrasena, rol };
    if (valores.actualizar) await deps.actualizarCuenta(datos);
    else await deps.crearCuenta(datos);
  } catch (error) {
    deps.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  if (generar) deps.stdout(`${contrasena}\n`);
  deps.stderr(`Cuenta ${valores.actualizar ? "actualizada" : "creada"} para ${correo}.\n`);
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
  const { actualizarCuentaDeMesa, crearCuentaDeMesa } = await import("../src/auth/crear-cuenta");
  const auth = await contenedor().autenticacion();
  return ejecutarCrearAdmin(process.argv.slice(2), {
    leerStdin,
    stdout: (texto) => process.stdout.write(texto),
    stderr: (texto) => process.stderr.write(texto),
    crearCuenta: async (datos) => {
      await crearCuentaDeMesa(auth, datos);
    },
    actualizarCuenta: (datos) => actualizarCuentaDeMesa(auth, datos),
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
