import type { RolDeMesa } from "@kuorum/application";
import { ErrorDeDominio } from "@kuorum/domain";
import type { Autenticacion } from "./crear-auth";

export interface DatosDeCuenta {
  correo: string;
  nombre: string;
  contrasena: string;
  rol: RolDeMesa;
}

export const LARGO_MINIMO_DE_CONTRASENA = 12;

// Camino de servidor: no pasa por sign-up, que está desactivado. Devuelve el id de la cuenta.
export async function crearCuentaDeMesa(
  auth: Autenticacion,
  { correo, nombre, contrasena, rol }: DatosDeCuenta,
): Promise<string> {
  if (contrasena.length < LARGO_MINIMO_DE_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.`);
  }
  const contexto = await auth.$context;
  const correoNormal = correo.trim().toLowerCase();
  if ((await contexto.internalAdapter.findUserByEmail(correoNormal)) !== null) {
    throw new ErrorDeDominio(
      "CORREO_REPETIDO",
      `Ya existe una cuenta con el correo ${correoNormal}.`,
    );
  }
  const hash = await contexto.password.hash(contrasena);
  const usuario = await contexto.internalAdapter.createUser(
    { email: correoNormal, name: nombre.trim(), emailVerified: true, rol },
    { method: "admin" },
  );
  try {
    await contexto.internalAdapter.linkAccount({
      userId: usuario.id,
      providerId: "credential",
      accountId: usuario.id,
      password: hash,
    });
  } catch (error) {
    await contexto.internalAdapter.deleteUser(usuario.id);
    throw error;
  }
  return usuario.id;
}

/** Cambia la contraseña de una cuenta por su id y cierra sus sesiones abiertas. */
export async function cambiarContrasenaDeMesa(
  auth: Autenticacion,
  usuarioId: string,
  contrasena: string,
): Promise<void> {
  if (contrasena.length < LARGO_MINIMO_DE_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.`);
  }
  const contexto = await auth.$context;
  await contexto.internalAdapter.updatePassword(
    usuarioId,
    await contexto.password.hash(contrasena),
  );
  await contexto.adapter.deleteMany({
    model: "session",
    where: [{ field: "userId", value: usuarioId }],
  });
}

/**
 * Cambia la contraseña y el rol de una cuenta que ya existe y cierra sus sesiones abiertas.
 * Sirve para rotar la contraseña de la cuenta de prueba sin borrarla: borrarla y crearla de nuevo
 * dejaría sus sesiones sin dueño.
 */
export async function actualizarCuentaDeMesa(
  auth: Autenticacion,
  { correo, contrasena, rol }: DatosDeCuenta,
): Promise<void> {
  if (contrasena.length < LARGO_MINIMO_DE_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.`);
  }
  const contexto = await auth.$context;
  const correoNormal = correo.trim().toLowerCase();
  const encontrado = await contexto.internalAdapter.findUserByEmail(correoNormal, {
    includeAccounts: false,
  });
  if (encontrado === null) throw new Error(`No existe una cuenta con el correo ${correoNormal}.`);
  const usuario = encontrado.user;
  await contexto.internalAdapter.updatePassword(
    usuario.id,
    await contexto.password.hash(contrasena),
  );
  await contexto.internalAdapter.updateUser(usuario.id, { rol });
  await contexto.adapter.deleteMany({
    model: "session",
    where: [{ field: "userId", value: usuario.id }],
  });
}
