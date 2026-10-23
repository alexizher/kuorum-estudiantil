"use client";

import { Boton, clasesDeBoton } from "@kuorum/ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ClienteDeMesaPorFetch, type ContenidoDeActaDeMesa } from "./cliente-de-mesa";
import { HojaDeConfirmacion } from "./hoja-de-confirmacion";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODALIDAD } from "./textos";
import { useActa } from "./use-acta";

const ETIQUETA_DE_MOCION: Readonly<Record<string, string>> = {
  ORDEN: "De orden",
  PROCEDIMIENTO: "De procedimiento",
  ACLARACION: "De aclaración",
  SUFICIENTE_ILUSTRACION: "De suficiente ilustración",
};

interface Propiedades {
  sesionId: string;
  titulo: string;
  /** Para pruebas; por defecto el fetch del navegador. */
  dependencias?: { fetch?: typeof globalThis.fetch };
}

function fechaDelActa(c: ContenidoDeActaDeMesa): string {
  const formato = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-CO", { timeZone: c.zonaHoraria, ...opciones });
  const dia = formato({ dateStyle: "long" }).format(new Date(c.inicio));
  const hora = formato({ timeStyle: "short" });
  return `${dia}, ${hora.format(new Date(c.inicio))} a ${hora.format(new Date(c.fin))}`;
}

function CamposFijos({ c }: { c: ContenidoDeActaDeMesa }) {
  const mociones = Object.entries(c.mociones).filter(([, n]) => n > 0);
  return (
    <section className={estilos.actaDatos} aria-labelledby="acta-datos">
      <h2 id="acta-datos" className={`titular ${estilos.tituloDeColumna}`}>
        Datos del acta
      </h2>
      <p>
        <strong>{c.titulo}</strong>
      </p>
      <p>
        {c.cuerpo} · {c.institucion}
      </p>
      <p>{fechaDelActa(c)}</p>
      <p>
        {ETIQUETA_DE_MODALIDAD[c.modalidad]}
        {c.lugar ? ` · ${c.lugar}` : ""}
      </p>
      {c.ordenDelDia.length > 0 ? (
        <>
          <h3 className={`titular ${estilos.subtitulo}`}>Orden del día</h3>
          <ol className={estilos.actaLista}>
            {c.ordenDelDia.map((punto, i) => (
              <li key={`${i}-${punto}`}>{punto}</li>
            ))}
          </ol>
        </>
      ) : null}
      <p>
        Asistentes: {c.asistentes === null ? "no se registran" : c.asistentes}. Intervenciones:{" "}
        {c.intervenciones}.
      </p>
      {mociones.length > 0 ? (
        <p>
          Mociones:{" "}
          {mociones.map(([tipo, n]) => `${ETIQUETA_DE_MOCION[tipo] ?? tipo} ${n}`).join(", ")}.
        </p>
      ) : null}
      <h3 className={`titular ${estilos.subtitulo}`}>Decisiones</h3>
      {c.decisiones.length === 0 ? (
        <p className="suave">No hubo votaciones cerradas.</p>
      ) : (
        <ol className={estilos.actaLista}>
          {c.decisiones.map((d, i) => (
            <li key={`${i}-${d.pregunta}`}>
              {d.enunciado ?? d.pregunta}
              {d.indicativa ? " (indicativa)" : ""}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function EditorDeActa({ sesionId, titulo, dependencias }: Propiedades) {
  const cliente = useMemo(
    () =>
      new ClienteDeMesaPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const a = useActa(cliente, sesionId);
  const [confirmando, setConfirmando] = useState(false);
  const final = a.acta?.estado === "FINAL";

  async function finalizar(): Promise<void> {
    setConfirmando(false);
    await a.finalizar();
  }

  return (
    <main className={estilos.acta}>
      <Link href={`/mesa/sesiones/${encodeURIComponent(sesionId)}`} className={estilos.volver}>
        Volver a la sesión
      </Link>
      <h1 className={`titular ${estilos.tituloDeSesion}`}>Acta: {titulo}</h1>
      {a.cargando ? <p role="status">Cargando el acta.</p> : null}
      {a.acta ? <CamposFijos c={a.acta.vistaPrevia} /> : null}
      {a.acta ? (
        <section aria-labelledby="acta-desarrollo" className={estilos.actaDatos}>
          <h2 id="acta-desarrollo" className={`titular ${estilos.tituloDeColumna}`}>
            Redacción del acta
          </h2>
          <label className="campo__etiqueta" htmlFor="desarrollo-del-acta">
            Desarrollo
          </label>
          <p className="campo__ayuda">Separa los párrafos con una línea en blanco.</p>
          <textarea
            id="desarrollo-del-acta"
            className="campo__entrada"
            rows={12}
            maxLength={20000}
            value={a.desarrollo}
            disabled={final}
            onChange={(e) => a.escribir(e.target.value)}
          />
        </section>
      ) : null}
      {a.error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {a.error}
        </p>
      ) : null}
      {a.acta && !final ? (
        <div className={estilos.accionesDeHoja}>
          <Boton onClick={() => void a.guardar()} disabled={a.ocupado}>
            Guardar borrador
          </Boton>
          <Boton variante="tinta" onClick={() => setConfirmando(true)} disabled={a.ocupado}>
            Finalizar acta
          </Boton>
          <p role="status" className="suave">
            {a.guardado ? "Borrador guardado." : ""}
          </p>
        </div>
      ) : null}
      {final && a.acta?.codigo ? (
        <section aria-labelledby="acta-final" className={estilos.actaDatos}>
          <h2 id="acta-final" className={`titular ${estilos.tituloDeColumna}`}>
            Acta final
          </h2>
          <p>
            Código de verificación: <span className={estilos.codigoDeActa}>{a.acta.codigo}</span>
          </p>
          <div className={estilos.enlacesDeActa}>
            <a
              className={clasesDeBoton({ variante: "tinta" })}
              href={`/api/public/v1/actas/${encodeURIComponent(sesionId)}.pdf`}
            >
              Descargar PDF
            </a>
            <a
              className={clasesDeBoton({})}
              href={`/actas/verificar?codigo=${encodeURIComponent(a.acta.codigo)}`}
            >
              Verificar
            </a>
          </div>
        </section>
      ) : null}
      <HojaDeConfirmacion
        abierta={confirmando}
        titulo="Finalizar el acta"
        texto="Se guarda el texto, se genera el código de verificación y el PDF. No se podrá editar después."
        textoDeConfirmar="Sí, finalizar"
        alConfirmar={() => void finalizar()}
        alCancelar={() => setConfirmando(false)}
      />
    </main>
  );
}
