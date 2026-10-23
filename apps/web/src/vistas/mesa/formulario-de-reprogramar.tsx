"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import { AvisoDeCruces } from "./aviso-de-cruces";
import { CamposDeHorario } from "./campo-de-horario";
import { CampoDeModalidad } from "./campo-de-modalidad";
import type { ClienteDeMesa, ProgramacionDeSesion } from "./cliente-de-mesa";
import { finLocal, separar } from "./horario";
import estilos from "./mesa.module.css";
import { useCruces } from "./use-cruces";
import type { GestionDeSesion } from "./use-gestion-de-sesion";

interface Propiedades {
  sesionId: string;
  titulo: string;
  programacion: ProgramacionDeSesion;
  gestion: GestionDeSesion;
  cliente: Pick<ClienteDeMesa, "buscarCruces">;
  alTerminar: () => void;
}

export function FormularioDeReprogramar({
  sesionId,
  titulo: tituloActual,
  programacion,
  gestion,
  cliente,
  alTerminar,
}: Propiedades) {
  const inicio = separar(programacion.inicioLocal);
  const [titulo, setTitulo] = useState(tituloActual);
  const [horario, setHorario] = useState({
    fecha: inicio.fecha,
    desde: inicio.hora,
    hasta: separar(programacion.finLocal).hora,
  });
  const [modalidad, setModalidad] = useState(programacion.modalidad);
  const [lugar, setLugar] = useState(programacion.lugar ?? "");
  const completo = horario.fecha !== "" && horario.desde !== "" && horario.hasta !== "";
  const nuevoInicio = completo ? `${horario.fecha}T${horario.desde}` : "";
  const nuevoFin = completo ? finLocal(horario.fecha, horario.desde, horario.hasta) : "";
  const { cruces } = useCruces(cliente, { inicio: nuevoInicio, fin: nuevoFin, excluir: sesionId });

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const guardada = await gestion.reprogramar({
      titulo: titulo.trim(),
      inicio: nuevoInicio,
      fin: nuevoFin,
      modalidad,
      lugar: lugar.trim() === "" ? null : lugar.trim(),
    });
    if (guardada) alTerminar();
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
      <CamposDeHorario
        {...horario}
        alCambiar={(cambios) => setHorario((actual) => ({ ...actual, ...cambios }))}
      />
      <CampoDeModalidad valor={modalidad} nombre="modalidad-reprogramar" alCambiar={setModalidad} />
      <CampoDeTexto
        etiqueta="Lugar (opcional)"
        value={lugar}
        onChange={(e) => setLugar(e.target.value)}
        maxLength={200}
        autoComplete="off"
      />
      <AvisoDeCruces cruces={cruces} />
      {gestion.error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {gestion.error}
        </p>
      ) : null}
      <div className={estilos.accionesDeHoja}>
        <Boton type="submit" variante="tinta" disabled={gestion.ocupado || !completo}>
          Guardar cambios
        </Boton>
        <Boton onClick={alTerminar}>Volver</Boton>
      </div>
    </form>
  );
}
