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

const PROVEEDORES_OAUTH = [
  { valor: "microsoft", etiqueta: "Microsoft Entra ID (Azure AD)" },
  { valor: "google", etiqueta: "Google Workspace" },
] as const;

export function FormularioDeInstitucion({
  institucion,
  panel,
}: {
  institucion: InstitucionDeMesa["institucion"];
  panel: PanelDeInstitucion;
}) {
  const [formulario, setFormulario] = useState(institucion);
  const cambiar = (campo: keyof typeof formulario) => (valor: string | null) =>
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

      <fieldset className={estilos.fieldset}>
        <legend className={estilos.legend}>Personalización visual</legend>
        <div className={estilos.dosColumnas}>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="logo-url">
              Logo (URL)
            </label>
            <p className="campo__ayuda" id="logo-url-ayuda">
              URL de una imagen (PNG, SVG, WebP). Se muestra en la portada y la proyección.
            </p>
            <input
              id="logo-url"
              type="url"
              className="campo__entrada"
              aria-describedby="logo-url-ayuda"
              value={formulario.logoUrl ?? ""}
              onChange={(e) => cambiar("logoUrl")(e.target.value || null)}
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="color-primario">
              Color primario
            </label>
            <p className="campo__ayuda" id="color-primario-ayuda">
              Color principal de la marca (formato #RRGGBB).
            </p>
            <input
              id="color-primario"
              type="color"
              className={`${estilos.colorInput} campo__entrada`}
              aria-describedby="color-primario-ayuda"
              value={formulario.colorPrimario ?? "#1b2242"}
              onChange={(e) => cambiar("colorPrimario")(e.target.value || null)}
            />
          </div>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="color-secundario">
              Color secundario
            </label>
            <p className="campo__ayuda" id="color-secundario-ayuda">
              Color de acento para botones y elementos destacados (formato #RRGGBB).
            </p>
            <input
              id="color-secundario"
              type="color"
              className={`${estilos.colorInput} campo__entrada`}
              aria-describedby="color-secundario-ayuda"
              value={formulario.colorSecundario ?? "#e2a11b"}
              onChange={(e) => cambiar("colorSecundario")(e.target.value || null)}
            />
          </div>
        </div>
        <CampoDeTexto
          etiqueta="Texto de bienvenida (portada)"
          ayuda="Texto que aparece en la página de inicio. Admite varias líneas."
          value={formulario.textoBienvenida ?? ""}
          onChange={(e) => cambiar("textoBienvenida")(e.target.value || null)}
          maxLength={1000}
        />
        <CampoDeTexto
          etiqueta="Pie de página"
          ayuda="Texto que aparece al final de todas las páginas públicas."
          value={formulario.pieDePagina ?? ""}
          onChange={(e) => cambiar("pieDePagina")(e.target.value || null)}
          maxLength={500}
        />
      </fieldset>

      <fieldset className={estilos.fieldset}>
        <legend className={estilos.legend}>Verificación institucional (OAuth)</legend>
        <p className={estilos.ayudaOAuth}>
          Permite a los participantes ingresar con su correo institucional (Microsoft Entra ID o Google Workspace).
          El correo se usa solo para verificar la identidad; no se almacena ni se muestra.
        </p>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="proveedor-oauth">
            Proveedor
          </label>
          <select
            id="proveedor-oauth"
            className="campo__entrada"
            value={formulario.proveedorOAuth ?? ""}
            onChange={(e) => cambiar("proveedorOAuth")(e.target.value || null)}
          >
            <option value="">— Sin verificación institucional —</option>
            {PROVEEDORES_OAUTH.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className={estilos.dosColumnas}>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="client-id-oauth">
              Client ID
            </label>
            <p className="campo__ayuda" id="client-id-oauth-ayuda">
              Identificador de la aplicación en el proveedor (Application/Client ID).
            </p>
            <input
              id="client-id-oauth"
              type="text"
              className="campo__entrada"
              aria-describedby="client-id-oauth-ayuda"
              value={formulario.clientIdOAuth ?? ""}
              onChange={(e) => cambiar("clientIdOAuth")(e.target.value || null)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={!formulario.proveedorOAuth}
            />
          </div>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="client-secret-oauth">
              Client Secret
            </label>
            <p className="campo__ayuda" id="client-secret-oauth-ayuda">
              Secreto de la aplicación. Se almacena en la base de datos; en producción debería ir encriptado.
            </p>
            <input
              id="client-secret-oauth"
              type="password"
              className="campo__entrada"
              aria-describedby="client-secret-oauth-ayuda"
              value={formulario.clientSecretOAuth ?? ""}
              onChange={(e) => cambiar("clientSecretOAuth")(e.target.value || null)}
              placeholder="••••••••••••••••"
              disabled={!formulario.proveedorOAuth}
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className={estilos.notaOAuth}>
          <strong>Nota:</strong> Al cambiar el proveedor o credenciales, las sesiones de autenticación existentes
          se invalidarán y los usuarios deberán iniciar sesión de nuevo.
        </p>
      </fieldset>

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
