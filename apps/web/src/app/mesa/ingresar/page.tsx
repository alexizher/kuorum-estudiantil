import { SelectorDeTema } from "@kuorum/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDeIngreso } from "../../../auth/formulario-de-ingreso";
import estilos from "../../../auth/ingreso.module.css";

export const metadata: Metadata = { title: "Ingresar a la mesa" };

export default function PaginaDeIngreso() {
  return (
    <main className={estilos.pagina}>
      <h1 className={`titular ${estilos.titulo}`}>Ingresar a la mesa</h1>
      <FormularioDeIngreso />
      <footer className={estilos.pie}>
        <Link href="/">Volver al inicio</Link>
        <SelectorDeTema />
      </footer>
    </main>
  );
}
