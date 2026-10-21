import Link from "next/link";
import estilos from "./participante.module.css";

export function SalaNoDisponible() {
  return (
    <section className={estilos.pantalla}>
      <h1 className={`titular ${estilos.mensaje}`}>Esta sala no existe o ya terminó.</h1>
      <Link href="/" className={estilos.enlace}>
        Ir a la portada
      </Link>
    </section>
  );
}
