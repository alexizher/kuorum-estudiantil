import { aHoraLocal } from "@kuorum/domain";
import Link from "next/link";
import { agruparPorDia, mesDesplazado, semanasDelMes } from "../../calendario/vista-de-calendario";
import estilos from "./calendario.module.css";
import { diaLargo, diaYMes, etiquetaDeModalidad, nombreDelMes } from "./textos";

export interface SesionVisible {
  id: string;
  titulo: string;
  cuerpo: { nombre: string; slug: string };
  inicio: Date;
  fin: Date;
  modalidad: string;
  lugar: string | null;
  estado: string;
}

export type VistaDeCalendario = "mes" | "lista";

export interface PropiedadesDeCalendario {
  institucion: { nombre: string; tipoDeCuerpoPlural: string; zonaHoraria: string };
  cuerpos: { nombre: string; slug: string; archivado: boolean }[];
  sesiones: SesionVisible[];
  vista: VistaDeCalendario;
  /** `2026-11`: el mes que se muestra en la vista de mes. */
  mes: string;
  cuerpoSlug: string | undefined;
  /** `https://dominio`, para los enlaces de suscripción. */
  origen: string;
}

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const ICS = "/api/public/v1/calendario.ics";

function enlace(vista: VistaDeCalendario, mes: string, cuerpo: string | undefined): string {
  const consulta = new URLSearchParams({ vista, ...(vista === "mes" ? { mes } : {}) });
  if (cuerpo !== undefined) consulta.set("cuerpo", cuerpo);
  return `/calendario?${consulta}`;
}

function Titulo({ sesion }: { sesion: SesionVisible }) {
  return sesion.estado === "CANCELADA" ? <s>{sesion.titulo}</s> : <>{sesion.titulo}</>;
}

function ListaDelDia({ sesiones, zona }: { sesiones: SesionVisible[]; zona: string }) {
  return (
    <ul className={estilos.delDia}>
      {sesiones.map((sesion) => (
        <li key={sesion.id} className={estilos.sesion} data-estado={sesion.estado}>
          <span className={`num ${estilos.hora}`}>
            {aHoraLocal(sesion.inicio, zona).hora} a {aHoraLocal(sesion.fin, zona).hora}
          </span>
          <span className={estilos.titulo}>
            <Titulo sesion={sesion} />
          </span>
          <span className={estilos.datos}>
            {sesion.cuerpo.nombre} · {etiquetaDeModalidad(sesion.modalidad)}
            {sesion.lugar ? ` · ${sesion.lugar}` : ""}
            {sesion.estado === "CANCELADA" ? " · Cancelada" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PorDias({
  sesiones,
  zona,
  etiqueta,
  className,
}: {
  sesiones: SesionVisible[];
  zona: string;
  etiqueta: string;
  className?: string | undefined;
}) {
  if (sesiones.length === 0) {
    return <p className={className}>No hay sesiones programadas en este periodo.</p>;
  }
  return (
    <ul className={`${estilos.dias} ${className ?? ""}`} aria-label={etiqueta}>
      {agruparPorDia(sesiones, zona).map(({ fecha, sesiones: delDia }) => (
        <li key={fecha}>
          <section aria-labelledby={`${etiqueta}-${fecha}`}>
            <h3 className={`titular ${estilos.dia}`} id={`${etiqueta}-${fecha}`}>
              {diaLargo(fecha)}
            </h3>
            <ListaDelDia sesiones={delDia} zona={zona} />
          </section>
        </li>
      ))}
    </ul>
  );
}

function Mes({ mes, sesiones, zona }: { mes: string; sesiones: SesionVisible[]; zona: string }) {
  return (
    <table className={estilos.mes}>
      <caption className="oculto">{nombreDelMes(mes)}</caption>
      <thead>
        <tr>
          {DIAS.map((dia) => (
            <th key={dia} scope="col">
              {dia}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {semanasDelMes(mes, sesiones, zona).map((semana) => (
          <tr key={semana[0]?.fecha}>
            {semana.map((dia) => (
              <td
                key={dia.fecha}
                aria-label={diaYMes(dia.fecha)}
                className={dia.delMes ? undefined : estilos.fuera}
              >
                <span className={`num ${estilos.numero}`} aria-hidden="true">
                  {Number(dia.fecha.slice(8))}
                </span>
                {dia.sesiones.map((sesion) => (
                  <p key={sesion.id} className={estilos.enCelda} data-estado={sesion.estado}>
                    <span className="num">{aHoraLocal(sesion.inicio, zona).hora}</span>{" "}
                    <Titulo sesion={sesion} />
                    <span className={estilos.cuerpoEnCelda}> · {sesion.cuerpo.nombre}</span>
                  </p>
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Calendario({
  institucion,
  cuerpos,
  sesiones,
  vista,
  mes,
  cuerpoSlug,
  origen,
}: PropiedadesDeCalendario) {
  const zona = institucion.zonaHoraria;
  const filtrado = cuerpos.find((c) => c.slug === cuerpoSlug);
  const visibles = cuerpos.filter((c) => !c.archivado || c.slug === cuerpoSlug);

  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <Link href="/" className={estilos.volver}>
          Inicio
        </Link>
        <h1 className="titular">Calendario</h1>
        <p className="suave">
          {institucion.nombre}
          {filtrado ? ` · ${filtrado.nombre}` : ""} · horas de {zona}
        </p>
      </header>

      <nav aria-label="Vista" className={estilos.vistas}>
        <Link
          href={enlace("mes", mes, cuerpoSlug)}
          aria-current={vista === "mes" ? "page" : undefined}
        >
          Mes
        </Link>
        <Link
          href={enlace("lista", mes, cuerpoSlug)}
          aria-current={vista === "lista" ? "page" : undefined}
        >
          Próximas
        </Link>
      </nav>

      <nav aria-label="Filtrar por cuerpo" className={estilos.filtro}>
        <Link
          href={enlace(vista, mes, undefined)}
          aria-current={cuerpoSlug === undefined ? "page" : undefined}
        >
          Todos
        </Link>
        {visibles.map((cuerpo) => (
          <Link
            key={cuerpo.slug}
            href={enlace(vista, mes, cuerpo.slug)}
            aria-current={cuerpo.slug === cuerpoSlug ? "page" : undefined}
          >
            {cuerpo.nombre}
          </Link>
        ))}
      </nav>

      {vista === "mes" ? (
        <section aria-labelledby="titulo-mes" className={estilos.seccion}>
          <div className={estilos.navegacionDeMes}>
            <Link
              href={enlace("mes", mesDesplazado(mes, -1), cuerpoSlug)}
              aria-label="Mes anterior"
            >
              ←
            </Link>
            <h2 className={`titular ${estilos.nombreDelMes}`} id="titulo-mes">
              {nombreDelMes(mes)}
            </h2>
            <Link
              href={enlace("mes", mesDesplazado(mes, 1), cuerpoSlug)}
              aria-label="Mes siguiente"
            >
              →
            </Link>
          </div>
          <div className={estilos.soloAncho}>
            <Mes mes={mes} sesiones={sesiones} zona={zona} />
          </div>
          <PorDias
            sesiones={sesiones}
            zona={zona}
            etiqueta="Sesiones del mes"
            className={estilos.soloAngosto}
          />
        </section>
      ) : (
        <section aria-labelledby="titulo-proximas" className={estilos.seccion}>
          <h2 className={`titular ${estilos.nombreDelMes}`} id="titulo-proximas">
            Próximas sesiones
          </h2>
          <PorDias sesiones={sesiones} zona={zona} etiqueta="Sesiones" />
        </section>
      )}

      <section aria-labelledby="titulo-suscribirse" className={estilos.suscripcion}>
        <h2 className={`titular ${estilos.nombreDelMes}`} id="titulo-suscribirse">
          Suscribirse
        </h2>
        <p>Copia el enlace y agrégalo en Google Calendar u Outlook como calendario por URL.</p>
        <p className={estilos.url}>
          <span className="suave">Todo el calendario: </span>
          <code>{`${origen}${ICS}`}</code>
        </p>
        {filtrado ? (
          <p className={estilos.url}>
            <span className="suave">Solo {filtrado.nombre}: </span>
            <code>{`${origen}${ICS}?cuerpo=${encodeURIComponent(filtrado.slug)}`}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
