import { Qr } from "@kuorum/ui";
import estilos from "./proyeccion.module.css";
import { direccionCorta } from "./textos";

interface Propiedades {
  codigo: string;
  urlDeEntrada: string;
}

/** Cómo entrar a la sala: QR, dirección corta y el código grande. */
export function EntradaConQr({ codigo, urlDeEntrada }: Propiedades) {
  return (
    <aside className={estilos.entrada} aria-label="Cómo entrar a la sala">
      <div className={estilos.qr}>
        <Qr valor={urlDeEntrada} etiqueta={`Código QR para entrar a la sala ${codigo}`} />
      </div>
      <p className={estilos.entradaTexto}>
        Escanea o entra a <span className={estilos.entradaUrl}>{direccionCorta(urlDeEntrada)}</span>
      </p>
      <p className={`titular ${estilos.codigo}`} aria-label={`Código de la sala: ${codigo}`}>
        {codigo}
      </p>
    </aside>
  );
}
