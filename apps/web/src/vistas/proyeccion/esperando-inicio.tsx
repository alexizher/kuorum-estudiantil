import type { EstadoDeSala } from "@kuorum/contracts";
import { EntradaConQr } from "./entrada-con-qr";
import estilos from "./proyeccion.module.css";

interface Propiedades {
  estado: EstadoDeSala;
  urlDeEntrada: string;
}

export function EsperandoInicio({ estado, urlDeEntrada }: Propiedades) {
  return (
    <section className={`${estilos.escena} ${estilos.esperando}`} aria-labelledby="titulo-sala">
      <div>
        <h1 id="titulo-sala" className={`titular ${estilos.tituloDeSala}`}>
          {estado.sala.titulo}
        </h1>
        <p className={estilos.sala}>Entra desde tu celular para votar y pedir la palabra.</p>
      </div>
      <EntradaConQr codigo={estado.sala.codigo} urlDeEntrada={urlDeEntrada} />
    </section>
  );
}
