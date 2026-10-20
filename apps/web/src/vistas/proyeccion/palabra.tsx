import type { EstadoDeSala } from "@kuorum/contracts";
import { Cronometro, formatearTiempo } from "@kuorum/ui";
import estilos from "./proyeccion.module.css";
import { etiquetaDeMocion } from "./textos";

interface Propiedades {
  estado: EstadoDeSala;
  segundosRestantes: number | null;
}

export function Palabra({ estado, segundosRestantes }: Propiedades) {
  const orador = estado.palabra.conLaPalabra;
  if (orador === null) return null;
  const { fila } = estado.palabra;
  return (
    <section className={`${estilos.escena} ${estilos.palabra}`} aria-labelledby="orador-nombre">
      <div>
        {orador.mocion !== null ? (
          <p className="mocion">{etiquetaDeMocion(orador.mocion)}</p>
        ) : null}
        <p className={estilos.oradorRotulo}>Tiene la palabra</p>
        <h1 id="orador-nombre" className={`titular ${estilos.oradorNombre}`}>
          {orador.nombre}
        </h1>
        <div className={estilos.reloj}>
          <Cronometro
            restantes={segundosRestantes ?? orador.segundosTotales}
            total={orador.segundosTotales}
            tamano="grande"
          />
          <p className={estilos.relojDetalle}>
            quedan de <span className="num">{formatearTiempo(orador.segundosTotales)}</span>
          </p>
        </div>
      </div>
      <div>
        <h2 className={`titular ${estilos.filaTitulo}`}>Fila</h2>
        {fila.length === 0 ? (
          <p className={estilos.filaVacia}>La fila está vacía.</p>
        ) : (
          <ol className={estilos.fila} aria-label="Fila de la palabra">
            {fila.map((solicitud, i) => (
              <li key={solicitud.id} data-mocion={solicitud.mocion !== null}>
                <span className={`${estilos.filaPosicion} num`}>{i + 1}</span>
                <div>
                  {solicitud.mocion !== null ? (
                    <>
                      <span className="mocion">{etiquetaDeMocion(solicitud.mocion)}</span>
                      <br />
                    </>
                  ) : null}
                  <span className={estilos.filaNombre}>{solicitud.nombre}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
