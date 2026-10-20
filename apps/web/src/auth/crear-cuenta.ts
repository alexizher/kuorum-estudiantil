import type { Autenticacion } from "./crear-auth";

export interface DatosDeCuenta {
  correo: string;
  nombre: string;
  contrasena: string;
}

export const LARGO_MINIMO_DE_CONTRASENA = 12;

// Camino de servidor: no pasa por sign-up, que está desactivado.
export async function crearCuentaDeMesa(
  auth: Autenticacion,
  { correo, nombre, contrasena }: DatosDeCuenta,
): Promise<void> {
  if (contrasena.length < LARGO_MINIMO_DE_CONTRASENA) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres.`);
  }
  const contexto = await auth.$context;
  const correoNormal = correo.trim().toLowerCase();
  if ((await contexto.internalAdapter.findUserByEmail(correoNormal)) !== null) {
    throw new Error(`Ya existe una cuenta con el correo ${correoNormal}.`);
  }
  const hash = await contexto.password.hash(contrasena);
  const usuario = await contexto.internalAdapter.createUser(
    { email: correoNormal, name: nombre.trim(), emailVerified: true },
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
}
