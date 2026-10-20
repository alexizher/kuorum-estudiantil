import type { Metadata } from "next";
import { FormularioDeIngreso } from "../../../auth/formulario-de-ingreso";

export const metadata: Metadata = { title: "Ingresar a la mesa" };

export default function PaginaDeIngreso() {
  return (
    <main>
      <h1>Ingresar a la mesa</h1>
      <FormularioDeIngreso />
    </main>
  );
}
