import { useId, type InputHTMLAttributes } from "react";

export interface PropiedadesDeCampo extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  etiqueta: string;
  ayuda?: string;
  error?: string | undefined;
  id?: string;
  /** Aspecto grande y condensado para códigos cortos. */
  codigo?: boolean;
}

export function CampoDeTexto({
  etiqueta,
  ayuda,
  error,
  id,
  codigo,
  className,
  ...resto
}: PropiedadesDeCampo) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;
  const descripcion = [idAyuda, idError].filter(Boolean).join(" ") || undefined;
  return (
    <div
      className={["campo", codigo ? "campo--codigo" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="campo__etiqueta" htmlFor={idCampo}>
        {etiqueta}
      </label>
      {ayuda ? (
        <p className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </p>
      ) : null}
      <input
        className="campo__entrada"
        id={idCampo}
        aria-describedby={descripcion}
        aria-invalid={error ? true : undefined}
        {...resto}
      />
      {error ? (
        <p className="campo__error" id={idError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
