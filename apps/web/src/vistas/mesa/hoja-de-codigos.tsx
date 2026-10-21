import { Qr } from "@kuorum/ui";
import { direccionCorta } from "../proyeccion/textos";
import { dividirEnHojas } from "./hojas-de-codigos";
import estilos from "./mesa.module.css";
import { enlaceDeCodigo, enlaceParaParticipantes } from "./textos";

interface Propiedades {
  codigos: readonly string[];
  codigoDeSala: string;
  /** Origen del sitio, por ejemplo https://kuorum.example */
  origen: string;
}

/** Lista imprimible: 40 por hoja carta, cada código con su QR y cómo usarlo. */
export function HojaDeCodigos({ codigos, codigoDeSala, origen }: Propiedades) {
  const instruccion = `Escanea o escribe el código en ${direccionCorta(enlaceParaParticipantes(origen, codigoDeSala))}`;
  return (
    <div className={estilos.hojas}>
      {dividirEnHojas(codigos).map((hoja, indice) => (
        <section
          key={hoja[0]}
          className={estilos.hojaImpresa}
          aria-label={`Hoja ${indice + 1} de códigos`}
        >
          {hoja.map((codigo) => (
            <article key={codigo} className={estilos.tarjeta}>
              <div className={estilos.qrChico}>
                <Qr
                  valor={enlaceDeCodigo(origen, codigoDeSala, codigo)}
                  etiqueta={`QR del código ${codigo}`}
                />
              </div>
              <div className={estilos.tarjetaTexto}>
                <p className={`${estilos.codigoImpreso} num`}>{codigo}</p>
                <p className={estilos.instruccion}>{instruccion}</p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
