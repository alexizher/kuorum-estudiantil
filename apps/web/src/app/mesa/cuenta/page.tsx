import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSesionDeMesa } from "@/auth/exigir-sesion-de-mesa";
import { CambiarContrasena } from "@/vistas/mesa/cambiar-contrasena";
import estilos from "@/vistas/administracion/administracion.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

/** La cuenta de prueba es compartida: no cambia su contraseña. */
export default async function PaginaDeCuenta() {
  const actor = await exigirSesionDeMesa();
  if (actor.rol === "DEMO") notFound();
  return (
    <div className={estilos.pagina}>
      <header role="banner" className={estilos.cabecera}>
        <Link href="/mesa" className={estilos.volver}>
          Sesiones
        </Link>
        <h1 className="titular">Mi cuenta</h1>
      </header>
      <main className={estilos.tablero}>
        <section aria-labelledby="titulo-contrasena" className={estilos.seccion}>
          <p>
            {actor.nombre} · <span className="suave">{actor.correo}</span>
          </p>
          <h2 className={`titular ${estilos.subtitulo}`} id="titulo-contrasena">
            Cambiar contraseña
          </h2>
          <CambiarContrasena />
        </section>
      </main>
    </div>
  );
}
