import type { EstadoDeSala } from "@kuorum/contracts";
import { vi } from "vitest";
import type { FuenteRefrescable } from "../../src/tiempo-real/fuente-de-estado";
import type { ClienteDeMesa, PreguntaDeMesa } from "../../src/vistas/mesa/cliente-de-mesa";

export function clienteDeMesaFalso(preguntas: PreguntaDeMesa[] = []) {
  return {
    listarSesiones: vi.fn<ClienteDeMesa["listarSesiones"]>(async () => []),
    crearSesion: vi.fn<ClienteDeMesa["crearSesion"]>(async (datos) => ({
      id: "nueva",
      titulo: datos.titulo,
      codigoDeSala: "NUEV",
      estado: "PROGRAMADA",
      modo: datos.modo,
      creadaEn: "2026-10-20T10:00:00.000Z",
    })),
    iniciar: vi.fn<ClienteDeMesa["iniciar"]>(async () => undefined),
    terminar: vi.fn<ClienteDeMesa["terminar"]>(async () => undefined),
    generarCodigos: vi.fn<ClienteDeMesa["generarCodigos"]>(async (_id, cantidad) =>
      Array.from({ length: cantidad }, (_, i) => `AAAA-${String(1000 + i)}`),
    ),
    listarPreguntas: vi.fn<ClienteDeMesa["listarPreguntas"]>(async () => preguntas),
    crearPregunta: vi.fn<ClienteDeMesa["crearPregunta"]>(async () => undefined),
    abrirPregunta: vi.fn<ClienteDeMesa["abrirPregunta"]>(async () => undefined),
    cerrarPregunta: vi.fn<ClienteDeMesa["cerrarPregunta"]>(async () => undefined),
    anularPregunta: vi.fn<ClienteDeMesa["anularPregunta"]>(async () => undefined),
    proyectarPregunta: vi.fn<ClienteDeMesa["proyectarPregunta"]>(async () => undefined),
    darLaPalabra: vi.fn<ClienteDeMesa["darLaPalabra"]>(async () => undefined),
    terminarIntervencion: vi.fn<ClienteDeMesa["terminarIntervencion"]>(async () => undefined),
    sumarMinuto: vi.fn<ClienteDeMesa["sumarMinuto"]>(async () => undefined),
    rechazarMocion: vi.fn<ClienteDeMesa["rechazarMocion"]>(async () => undefined),
  };
}

export class FuenteRefrescableFalsa implements FuenteRefrescable {
  alCambiar: ((estado: EstadoDeSala) => void) | undefined;
  alNoExistir: (() => void) | undefined;
  alIntentar: ((conExito: boolean) => void) | undefined;
  codigo: string | undefined;
  canceladas = 0;
  refrescos = 0;
  suscribir(
    codigo: string,
    alCambiar: (estado: EstadoDeSala) => void,
    alNoExistir?: () => void,
    alIntentar?: (conExito: boolean) => void,
  ): () => void {
    this.codigo = codigo;
    this.alCambiar = alCambiar;
    this.alNoExistir = alNoExistir;
    this.alIntentar = alIntentar;
    return () => {
      this.canceladas++;
    };
  }
  refrescar(): void {
    this.refrescos++;
  }
}

export const borrador: PreguntaDeMesa = {
  id: "p1",
  texto: "¿Aprueba el orden del día?",
  estado: "BORRADOR",
  resultadoProyectado: false,
  opciones: [
    { id: "o1", texto: "Sí" },
    { id: "o2", texto: "No" },
  ],
};
