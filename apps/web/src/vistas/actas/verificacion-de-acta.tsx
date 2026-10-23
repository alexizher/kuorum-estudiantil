import type { ResumenDeActaVerificada } from "@kuorum/application";
import { aHoraLocal } from "@kuorum/domain";
import Link from "next/link";
import estilos from "./verificacion.module.css";

export interface PropiedadesDeVerificacion {
  /** Lo que escribió la persona; undefined si aún no consultó. */
  codigo: string | undefined;
  acta: ResumenDeActaVerificada | null;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function fechaLarga(fecha: string): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** Fecha y hora en la zona de la institución. */
function fechaYHora(instante: Date, zona: string): string {
  const { fecha, hora } = aHoraLocal(instante, zona);
  return `${fechaLarga(fecha)}, ${hora}`;
}

export function VerificacionDeActa({ codigo, acta }: PropiedadesDeVerificacion) {
  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <Link href="/" className={estilos.volver}>
          Inicio
        </Link>
        <h1 className="titular">Verificar un acta</h1>
        <p className="suave">Escribe el código que aparece al pie del PDF.</p>
      </header>

      <form method="get" action="/actas/verificar" className={estilos.formulario}>
        <label className="campo__etiqueta" htmlFor="codigo">
          Código de verificación
        </label>
        <div className={estilos.fila}>
          <input
            className="campo__entrada"
            id="codigo"
            name="codigo"
            type="text"
            defaultValue={codigo ?? ""}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXXX-XXXXX"
          />
          <button type="submit" className="boton boton--tinta">
            Verificar
          </button>
        </div>
      </form>

      {codigo === undefined ? null : acta === null ? (
        <p role="status" className={estilos.noEncontrada}>
          No encontramos un acta con ese código
        </p>
      ) : (
        <section aria-labelledby="titulo-acta" className={estilos.resultado}>
          <h2 className="titular" id="titulo-acta">
            Acta auténtica
          </h2>
          <dl className={estilos.datos}>
            <dt>Cuerpo</dt>
            <dd>{acta.cuerpo}</dd>
            <dt>Sesión</dt>
            <dd>{acta.titulo}</dd>
            <dt>Fecha</dt>
            <dd>{fechaYHora(new Date(acta.inicio), acta.zonaHoraria)}</dd>
            <dt>Finalizada en</dt>
            <dd>{fechaYHora(acta.finalizadaEn, acta.zonaHoraria)}</dd>
            <dt>Código</dt>
            <dd className="num">{acta.codigo}</dd>
          </dl>
          <a className={estilos.pdf} href={`/api/public/v1/actas/${acta.sesionId}.pdf`}>
            Descargar el acta en PDF
          </a>
        </section>
      )}
    </main>
  );
}
