"use client";

import { Boton } from "@kuorum/ui";
import { useId, useState } from "react";
import type { CuerpoDeMesa } from "../mesa/cliente-de-mesa";
import estilos from "./administracion.module.css";
import type { PersonaDelPersonal, RolEnCuerpo } from "./cliente-de-administracion";
import type { PanelDePersonal } from "./use-personal";

const ROLES: readonly { valor: RolEnCuerpo; etiqueta: string }[] = [
  { valor: "ENCARGADO", etiqueta: "Encargado: programa y conduce" },
  { valor: "MESA", etiqueta: "Mesa: conduce" },
];

export function TarjetaDePersona({
  persona,
  cuerpos,
  panel,
}: {
  persona: PersonaDelPersonal;
  cuerpos: readonly CuerpoDeMesa[];
  panel: PanelDePersonal;
}) {
  const id = useId();
  const nombreDe = (cuerpoId: string) => cuerpos.find((c) => c.id === cuerpoId)?.nombre ?? "";
  const disponibles = cuerpos.filter(
    (c) => !c.archivado && !persona.membresias.some((m) => m.cuerpoId === c.id),
  );
  const [nuevo, setNuevo] = useState("");
  const elegido = disponibles.some((c) => c.id === nuevo) ? nuevo : (disponibles[0]?.id ?? "");

  return (
    <article className={estilos.persona} aria-labelledby={`${id}-nombre`}>
      <h3 className={`titular ${estilos.nombre}`} id={`${id}-nombre`}>
        {persona.nombre}
      </h3>
      <p className="suave">{persona.correo}</p>
      {persona.membresias.length === 0 ? (
        <p className="suave">Sin cuerpos: no ve sesiones.</p>
      ) : (
        <ul className={estilos.lista}>
          {persona.membresias.map((m) => {
            const nombre = nombreDe(m.cuerpoId);
            return (
              <li className={estilos.fila} key={m.cuerpoId}>
                <span className={estilos.nombre}>{nombre}</span>
                <span className={estilos.acciones}>
                  <label className="oculto" htmlFor={`${id}-${m.cuerpoId}`}>
                    Rol en {nombre}
                  </label>
                  <select
                    id={`${id}-${m.cuerpoId}`}
                    className="campo__entrada"
                    value={m.rol}
                    disabled={panel.ocupado}
                    onChange={(e) =>
                      void panel.asignar(persona.id, m.cuerpoId, e.target.value as RolEnCuerpo)
                    }
                  >
                    {ROLES.map((rol) => (
                      <option key={rol.valor} value={rol.valor}>
                        {rol.etiqueta}
                      </option>
                    ))}
                  </select>
                  <Boton
                    variante="plano"
                    aria-label={`Quitar de ${nombre}`}
                    disabled={panel.ocupado}
                    onClick={() => void panel.quitar(persona.id, m.cuerpoId)}
                  >
                    Quitar
                  </Boton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className={estilos.enLinea}>
        {disponibles.length > 0 ? (
          <>
            <div className="campo">
              <label className="campo__etiqueta" htmlFor={`${id}-agregar`}>
                Agregar a
              </label>
              <select
                id={`${id}-agregar`}
                className="campo__entrada"
                value={elegido}
                onChange={(e) => setNuevo(e.target.value)}
              >
                {disponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Boton
              disabled={panel.ocupado}
              onClick={() => void panel.asignar(persona.id, elegido, "MESA")}
            >
              Agregar
            </Boton>
          </>
        ) : null}
        <Boton
          variante="plano"
          disabled={panel.ocupado}
          onClick={() => void panel.restablecer(persona)}
        >
          Generar contraseña nueva
        </Boton>
      </div>
    </article>
  );
}
