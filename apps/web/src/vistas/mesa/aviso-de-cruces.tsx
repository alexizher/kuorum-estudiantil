import type { CruceDeSesion } from "./cliente-de-mesa";
import { fechaYHora, separar } from "./horario";
import estilos from "./mesa.module.css";

/** Avisa que el horario choca con otras sesiones. No bloquea: la mesa decide. */
export function AvisoDeCruces({ cruces }: { cruces: readonly CruceDeSesion[] }) {
  return (
    <div role="status" className={cruces.length > 0 ? estilos.avisoDeCruces : undefined}>
      {cruces.length > 0 ? (
        <>
          <p className={estilos.avisoTitulo}>Se cruza con:</p>
          <ul className={estilos.listaDeCruces}>
            {cruces.map((cruce) => (
              <li key={cruce.id}>
                {cruce.titulo} ({cruce.cuerpo}), {fechaYHora(cruce.inicioLocal)} a{" "}
                {separar(cruce.finLocal).hora}
              </li>
            ))}
          </ul>
          <p>Puedes guardarla igual.</p>
        </>
      ) : null}
    </div>
  );
}
