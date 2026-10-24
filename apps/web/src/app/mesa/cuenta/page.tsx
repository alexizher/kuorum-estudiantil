import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSesionDeMesa } from "@/auth/exigir-sesion-de-mesa";
import { CabeceraDeMesa } from "@/vistas/mesa/cabecera-de-mesa";
import { CambiarContrasena } from "@/vistas/mesa/cambiar-contrasena";
import { PieDeMesa } from "@/vistas/mesa/pie-de-mesa";
import estilos from "@/vistas/administracion/administracion.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

/** La cuenta de prueba es compartida: no cambia su contraseña. */
export default async function PaginaDeCuenta() {
  const actor = await exigirSesionDeMesa();
  if (actor.rol === "DEMO") notFound();
  return (
    <div className={estilos.pagina}>
      <CabeceraDeMesa
        titulo="Mi cuenta"
        actual="cuenta"
        esAdministrador={actor.rol === "SUPERADMIN"}
      />
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
      <PieDeMesa />
    </div>
  );
}
