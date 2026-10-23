"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import type { CuerpoDeMesa } from "../mesa/cliente-de-mesa";
import { HojaDeConfirmacion } from "../mesa/hoja-de-confirmacion";
import estilos from "./administracion.module.css";
import type { PanelDeInstitucion } from "./use-institucion";

interface Propiedades {
  cuerpos: readonly CuerpoDeMesa[];
  tipoSingular: string;
  panel: PanelDeInstitucion;
}

function FilaDeCuerpo({
  cuerpo,
  panel,
  alPedirArchivar,
}: {
  cuerpo: CuerpoDeMesa;
  panel: PanelDeInstitucion;
  alPedirArchivar: (cuerpo: CuerpoDeMesa) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(cuerpo.nombre);

  async function alGuardar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (await panel.renombrarCuerpo(cuerpo.id, nombre)) setEditando(false);
  }

  if (editando) {
    return (
      <li className={estilos.fila}>
        <form className={estilos.enLinea} onSubmit={(e) => void alGuardar(e)} noValidate>
          <CampoDeTexto
            etiqueta={`Nuevo nombre de ${cuerpo.nombre}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={120}
          />
          <Boton type="submit" variante="tinta" disabled={panel.ocupado}>
            Guardar nombre
          </Boton>
          <Boton onClick={() => setEditando(false)}>Volver</Boton>
        </form>
      </li>
    );
  }
  return (
    <li className={estilos.fila}>
      <span className={estilos.nombre}>
        {cuerpo.nombre}
        {cuerpo.tipo === "GENERAL" ? <span className="suave"> (general)</span> : null}
      </span>
      <span className={estilos.acciones}>
        <Boton
          variante="plano"
          aria-label={`Renombrar ${cuerpo.nombre}`}
          onClick={() => setEditando(true)}
        >
          Renombrar
        </Boton>
        {cuerpo.tipo === "FACULTAD" ? (
          <Boton
            variante="plano"
            aria-label={`Archivar ${cuerpo.nombre}`}
            onClick={() => alPedirArchivar(cuerpo)}
          >
            Archivar
          </Boton>
        ) : null}
      </span>
    </li>
  );
}

export function ListaDeCuerpos({ cuerpos, tipoSingular, panel }: Propiedades) {
  const [nuevo, setNuevo] = useState("");
  const [porArchivar, setPorArchivar] = useState<CuerpoDeMesa | null>(null);
  const activos = cuerpos.filter((c) => !c.archivado);
  const archivados = cuerpos.filter((c) => c.archivado);
  const tipo = tipoSingular.toLowerCase();

  async function alAgregar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (nuevo.trim() === "") return;
    if (await panel.agregarCuerpo(nuevo)) setNuevo("");
  }

  async function archivar(): Promise<void> {
    const cuerpo = porArchivar;
    setPorArchivar(null);
    if (cuerpo) await panel.archivarCuerpo(cuerpo.id);
  }

  return (
    <>
      <ul className={estilos.lista} aria-label="Cuerpos activos">
        {activos.map((cuerpo) => (
          <FilaDeCuerpo
            key={`${cuerpo.id}-${cuerpo.nombre}`}
            cuerpo={cuerpo}
            panel={panel}
            alPedirArchivar={setPorArchivar}
          />
        ))}
      </ul>
      <form className={estilos.enLinea} onSubmit={(e) => void alAgregar(e)} noValidate>
        <CampoDeTexto
          etiqueta={`Nombre de la nueva ${tipo}`}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={120}
          autoComplete="off"
        />
        <Boton type="submit" variante="tinta" disabled={panel.ocupado}>
          Agregar {tipo}
        </Boton>
      </form>
      {panel.errorDeCuerpos ? (
        <p role="alert" className={estilos.error}>
          {panel.errorDeCuerpos}
        </p>
      ) : null}
      {archivados.length > 0 ? (
        <>
          <h3 className={`titular ${estilos.subtitulo}`} id="titulo-archivados">
            Archivados
          </h3>
          <p className="suave">
            No reciben sesiones nuevas. Las que tenían siguen en el calendario.
          </p>
          <ul className={estilos.lista} aria-label="Archivados">
            {archivados.map((cuerpo) => (
              <li className={estilos.fila} key={cuerpo.id}>
                <span className={`${estilos.nombre} suave`}>{cuerpo.nombre}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <HojaDeConfirmacion
        abierta={porArchivar !== null}
        titulo={`Archivar ${porArchivar?.nombre ?? ""}`}
        texto="No se podrán programar sesiones nuevas en este cuerpo. Las que ya tiene se conservan. No se puede deshacer desde el panel."
        textoDeConfirmar="Sí, archivar"
        alConfirmar={() => void archivar()}
        alCancelar={() => setPorArchivar(null)}
      />
    </>
  );
}
