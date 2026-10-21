"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState } from "react";
import { etiquetaDeMocion } from "../proyeccion/textos";
import { HojaDeMocion } from "./hoja-de-mocion";
import { IconoMano } from "./iconos";
import estilos from "./participante.module.css";
import type { Palabra, Turno } from "./use-palabra";

interface Propiedades {
  palabra: Palabra;
  /** Quien habla ahora, si alguien. */
  orador: EstadoDeSala["palabra"]["conLaPalabra"];
}

function TarjetaDeTurno({
  turno,
  alRetirar,
  ocupado,
}: {
  turno: Turno;
  alRetirar: () => void;
  ocupado: boolean;
}) {
  const esMocion = turno.tipo === "MOCION";
  const etiqueta = turno.mocion ? (
    <span className="mocion">{etiquetaDeMocion(turno.mocion)}</span>
  ) : null;

  if (turno.situacion === "con-la-palabra") {
    return (
      <div className={estilos.turno}>
        {etiqueta}
        <p className={`titular ${estilos.mensaje}`}>Tienes la palabra</p>
        <p className={estilos.turnoDetalle}>Habla cuando la mesa te lo indique.</p>
      </div>
    );
  }
  if (turno.situacion === "pendiente") {
    return (
      <div className={estilos.turno}>
        {etiqueta}
        <p role="status" className={estilos.turnoTexto}>
          Anotándote en la fila...
        </p>
      </div>
    );
  }
  return (
    <div className={estilos.turno}>
      {etiqueta}
      <p className={estilos.soloLectores}>
        Vas en el lugar {turno.lugar} de {turno.total}.
      </p>
      <div className={estilos.turnoFila} aria-hidden="true">
        <span className={`num ${estilos.turnoLugar}`}>{turno.lugar}</span>
        <div>
          <p className={estilos.turnoTexto}>
            {esMocion ? "Tu moción está en la fila" : "Es tu lugar en la fila"}
          </p>
          <p className="suave">
            de {turno.total} {turno.total === 1 ? "persona" : "personas"}
          </p>
        </div>
      </div>
      {esMocion ? null : (
        <p className={estilos.turnoDetalle}>
          Las mociones pasan primero. Esta pantalla se actualiza sola.
        </p>
      )}
      <Boton variante="peligro" ancho onClick={alRetirar} disabled={ocupado}>
        {esMocion ? "Retirar la moción" : "Retirarme de la fila"}
      </Boton>
    </div>
  );
}

export function PanelDePalabra({ palabra, orador }: Propiedades) {
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [cambiandoNombre, setCambiandoNombre] = useState(false);
  const pideNombre = !palabra.nombreRecordado || cambiandoNombre;

  return (
    <>
      <h1 className={estilos.soloLectores}>Palabra</h1>
      {orador ? (
        <div className={estilos.orador}>
          <p className={estilos.oradorRotulo}>Ahora habla</p>
          <p className={`titular ${estilos.oradorNombre}`}>{orador.nombre}</p>
          {orador.mocion ? <span className="mocion">{etiquetaDeMocion(orador.mocion)}</span> : null}
        </div>
      ) : null}

      {palabra.turnos.map((turno) => (
        <TarjetaDeTurno
          key={turno.id}
          turno={turno}
          ocupado={palabra.ocupado}
          alRetirar={() => void palabra.retirar(turno.id)}
        />
      ))}

      {palabra.tieneIntervencion ? null : (
        <>
          {pideNombre ? (
            <CampoDeTexto
              etiqueta="Cómo quieres que te anuncien"
              ayuda="Nombre y, si quieres, tu facultad. Lo ve la mesa y sale en la proyección."
              value={palabra.nombre}
              onChange={(evento) => palabra.escribirNombre(evento.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          ) : (
            <p className={estilos.nombre}>
              <span>
                Te anunciamos como <strong>{palabra.nombre}</strong>.
              </span>
              <Boton
                variante="plano"
                className={estilos.nombreCambiar}
                onClick={() => setCambiandoNombre(true)}
              >
                Cambiar
              </Boton>
            </p>
          )}
          <Boton
            variante="tinta"
            ancho
            className={estilos.pedir}
            disabled={palabra.ocupado}
            onClick={() => void palabra.pedirPalabra()}
          >
            <IconoMano />
            Pedir la palabra
          </Boton>
        </>
      )}

      {palabra.error && !hojaAbierta ? (
        <p className={`${estilos.error} ${estilos.errorSuelto}`} role="alert">
          {palabra.error}
        </p>
      ) : null}

      {palabra.tieneMocion ? null : (
        <>
          <Boton ancho className={estilos.secundaria} onClick={() => setHojaAbierta(true)}>
            Presentar una moción
          </Boton>
          <p className={estilos.nota}>
            Una moción interrumpe el orden de la fila para tratar algo de la sesión.
          </p>
        </>
      )}

      <HojaDeMocion
        abierta={hojaAbierta}
        alCerrar={() => setHojaAbierta(false)}
        alPresentar={palabra.presentarMocion}
        nombre={
          palabra.nombreRecordado
            ? null
            : { valor: palabra.nombre, alCambiar: palabra.escribirNombre }
        }
        error={hojaAbierta ? palabra.error : undefined}
        ocupado={palabra.ocupado}
      />
    </>
  );
}
