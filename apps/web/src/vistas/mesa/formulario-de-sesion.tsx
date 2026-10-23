"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import { AvisoDeCruces } from "./aviso-de-cruces";
import { CamposDeHorario } from "./campo-de-horario";
import { CampoDeOrdenDelDia } from "./campo-de-orden-del-dia";
import { CampoDeModalidad } from "./campo-de-modalidad";
import type { ClienteDeMesa, CuerpoDeMesa, Modalidad, ModoDeSala } from "./cliente-de-mesa";
import { finLocal, inicioPorDefecto } from "./horario";
import { puntosDeTexto } from "./orden-del-dia";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODO, EXPLICACION_DE_MODO } from "./textos";
import { useCruces } from "./use-cruces";
import { SEGUNDOS_POR_DEFECTO, type Sesiones } from "./use-sesiones";

const MODOS: readonly ModoDeSala[] = ["CON_CODIGOS", "SALA_ABIERTA"];

interface Propiedades {
  crear: Sesiones["crear"];
  creando: boolean;
  error: string | undefined;
  /** Solo los cuerpos donde la cuenta puede programar. */
  cuerpos: readonly CuerpoDeMesa[];
  cliente: Pick<ClienteDeMesa, "buscarCruces">;
  /** Para pruebas; por defecto la hora del navegador. */
  ahora?: () => Date;
}

export function FormularioDeSesion({
  crear,
  creando,
  error,
  cuerpos,
  cliente,
  ahora = () => new Date(),
}: Propiedades) {
  const [titulo, setTitulo] = useState("");
  const [modo, setModo] = useState<ModoDeSala>("CON_CODIGOS");
  const [segundos, setSegundos] = useState(String(SEGUNDOS_POR_DEFECTO));
  const [cuerpoElegido, setCuerpoElegido] = useState("");
  const [horario, setHorario] = useState(() => inicioPorDefecto(ahora()));
  const [modalidad, setModalidad] = useState<Modalidad>("PRESENCIAL");
  const [lugar, setLugar] = useState("");
  const [orden, setOrden] = useState("");
  const cuerpoId = cuerpoElegido !== "" ? cuerpoElegido : (cuerpos[0]?.id ?? "");
  const completo = horario.fecha !== "" && horario.desde !== "" && horario.hasta !== "";
  const { cruces } = useCruces(cliente, {
    inicio: completo ? `${horario.fecha}T${horario.desde}` : "",
    fin: completo ? finLocal(horario.fecha, horario.desde, horario.hasta) : "",
  });

  if (cuerpos.length === 0) {
    return (
      <p className={estilos.vacia}>
        No puedes programar sesiones en ningún cuerpo. Si te hace falta, pídeselo al administrador
        de la instalación.
      </p>
    );
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const creada = await crear({
      titulo,
      modo,
      segundos: Number(segundos),
      cuerpoId,
      ...horario,
      modalidad,
      lugar,
      ordenDelDia: puntosDeTexto(orden),
    });
    if (creada) {
      setTitulo("");
      setOrden("");
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void alEnviar(e)} noValidate>
      <CampoDeTexto
        etiqueta="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={300}
        autoComplete="off"
      />
      {cuerpos.length === 1 ? (
        <p className={estilos.cuerpoFijo}>
          <span className="suave">Cuerpo</span> <strong>{cuerpos[0]?.nombre}</strong>
        </p>
      ) : (
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="cuerpo-de-sesion">
            Cuerpo
          </label>
          <select
            id="cuerpo-de-sesion"
            className="campo__entrada"
            value={cuerpoId}
            onChange={(e) => setCuerpoElegido(e.target.value)}
          >
            {cuerpos.map((cuerpo) => (
              <option key={cuerpo.id} value={cuerpo.id}>
                {cuerpo.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <CamposDeHorario
        {...horario}
        alCambiar={(cambios) => setHorario((actual) => ({ ...actual, ...cambios }))}
      />
      <CampoDeModalidad valor={modalidad} nombre="modalidad" alCambiar={setModalidad} />
      <CampoDeTexto
        etiqueta="Lugar (opcional)"
        ayuda="Salón o enlace de la videollamada."
        value={lugar}
        onChange={(e) => setLugar(e.target.value)}
        maxLength={200}
        autoComplete="off"
      />
      <CampoDeOrdenDelDia valor={orden} alCambiar={setOrden} />
      <fieldset className={estilos.conjunto}>
        <legend>Modo</legend>
        {MODOS.map((valor) => (
          <label className={estilos.radio} key={valor}>
            <input
              type="radio"
              name="modo"
              value={valor}
              checked={modo === valor}
              onChange={() => setModo(valor)}
            />
            <span>
              <strong>{ETIQUETA_DE_MODO[valor]}</strong>
              <span className={`${estilos.explicacion} suave`}>{EXPLICACION_DE_MODO[valor]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <CampoDeTexto
        etiqueta="Segundos por intervención"
        type="number"
        inputMode="numeric"
        min={30}
        max={900}
        value={segundos}
        onChange={(e) => setSegundos(e.target.value)}
      />
      <AvisoDeCruces cruces={cruces} />
      {error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {error}
        </p>
      ) : null}
      <Boton type="submit" variante="tinta" disabled={creando}>
        Crear sesión
      </Boton>
    </form>
  );
}
