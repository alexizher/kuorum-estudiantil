import { SelectorDeTema } from "@kuorum/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { cuentaDePruebaDesdeEntorno } from "../../../auth/cuenta-de-prueba";
import { FormularioDeIngreso } from "../../../auth/formulario-de-ingreso";
import estilos from "../../../auth/ingreso.module.css";

// Lee el entorno en cada petición: la cuenta de prueba se enciende sin volver a compilar.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ingresar a la mesa" };

export default async function PaginaDeIngreso() {
  return (
    <main className={estilos.pagina}>
      <h1 className={`titular ${estilos.titulo}`}>Ingresar a la mesa</h1>
      <FormularioDeIngreso cuentaDePrueba={cuentaDePruebaDesdeEntorno(process.env)} />
      <footer className={estilos.pie}>
        <Link href="/">Volver al inicio</Link>
        <SelectorDeTema />
      </footer>
    </main>
  );
}
