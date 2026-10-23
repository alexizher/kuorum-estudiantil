"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import type { InstitucionDeMesa } from "../mesa/cliente-de-mesa";
import estilos from "./administracion.module.css";
import type { PanelDeInstitucion } from "./use-institucion";

function zonasHorarias(actual: string): string[] {
  const zonas =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return zonas.includes(actual) ? zonas : [actual, ...zonas];
}

export function FormularioDeInstitucion({
  institucion,
  panel,
}: {
  institucion: InstitucionDeMesa["institucion"];
  panel: PanelDeInstitucion;
}) {
  const [formulario, setFormulario] = useState(institucion);
  const cambiar = (campo: keyof typeof formulario) => (valor: string) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    await panel.guardar(formulario);
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void alEnviar(e)} noValidate>
      <CampoDeTexto
        etiqueta="Nombre de la institución"
        value={formulario.nombre}
        onChange={(e) => cambiar("nombre")(e.target.value)}
        maxLength={120}
      />
      <div className={estilos.dosColumnas}>
        <CampoDeTexto
          etiqueta="Tipo de cuerpo, en singular"
          ayuda="Facultad, escuela, sede..."
          value={formulario.tipoDeCuerpoSingular}
          onChange={(e) => cambiar("tipoDeCuerpoSingular")(e.target.value)}
          maxLength={40}
        />
        <CampoDeTexto
          etiqueta="En plural"
          value={formulario.tipoDeCuerpoPlural}
          onChange={(e) => cambiar("tipoDeCuerpoPlural")(e.target.value)}
          maxLength={40}
        />
      </div>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="zona-horaria">
          Zona horaria
        </label>
        <p className="campo__ayuda" id="zona-horaria-ayuda">
          Las horas de las sesiones se escriben y se muestran en esta zona.
        </p>
        <select
          id="zona-horaria"
          className="campo__entrada"
          aria-describedby="zona-horaria-ayuda"
          value={formulario.zonaHoraria}
          onChange={(e) => cambiar("zonaHoraria")(e.target.value)}
        >
          {zonasHorarias(institucion.zonaHoraria).map((zona) => (
            <option key={zona} value={zona}>
              {zona}
            </option>
          ))}
        </select>
      </div>
      {panel.errorDeInstitucion ? (
        <p role="alert" className={estilos.error}>
          {panel.errorDeInstitucion}
        </p>
      ) : null}
      <p role="status" className={estilos.estado}>
        {panel.guardado ? "Cambios guardados." : ""}
      </p>
      <Boton type="submit" variante="tinta" disabled={panel.ocupado}>
        Guardar
      </Boton>
    </form>
  );
}
