import type { EstadoDeSala } from "@kuorum/contracts";
import { vi } from "vitest";
import type { FuenteRefrescable } from "../../src/tiempo-real/fuente-de-estado";
import type {
  ClienteDeMesa,
  InstitucionDeMesa,
  PreguntaDeMesa,
  ResultadoDeVotacion,
  SesionDeLista,
} from "../../src/vistas/mesa/cliente-de-mesa";

export const INSTITUCION: InstitucionDeMesa = {
  institucion: {
    nombre: "Universidad de Ejemplo",
    tipoDeCuerpoSingular: "Facultad",
    tipoDeCuerpoPlural: "Facultades",
    zonaHoraria: "America/Bogota",
    logoUrl: null,
    colorPrimario: null,
    colorSecundario: null,
    pieDePagina: null,
    textoBienvenida: null,
    proveedorOAuth: null,
    clientIdOAuth: null,
    clientSecretOAuth: null,
  },
  cuerpos: [
    {
      id: "c-g",
      nombre: "Asamblea general",
      slug: "asamblea-general",
      tipo: "GENERAL",
      archivado: false,
      puedeProgramar: true,
    },
    {
      id: "c-a",
      nombre: "Artes",
      slug: "artes",
      tipo: "FACULTAD",
      archivado: false,
      puedeProgramar: true,
    },
    {
      id: "c-m",
      nombre: "Medicina",
      slug: "medicina",
      tipo: "FACULTAD",
      archivado: false,
      puedeProgramar: false,
    },
  ],
};

export function sesionDeLista(cambios: Partial<SesionDeLista> = {}): SesionDeLista {
  return {
    id: "s1",
    titulo: "Asamblea",
    codigoDeSala: "K7F2",
    estado: "EN_CURSO",
    modo: "CON_CODIGOS",
    creadaEn: "2026-10-20T10:00:00.000Z",
    cuerpo: { id: "c-g", nombre: "Asamblea general" },
    inicio: "2026-11-03T19:00:00.000Z",
    fin: "2026-11-03T21:00:00.000Z",
    inicioLocal: "2026-11-03T14:00",
    finLocal: "2026-11-03T16:00",
    modalidad: "PRESENCIAL",
    lugar: null,
    puedeGestionar: true,
    ...cambios,
  };
}

export function clienteDeMesaFalso(preguntas: PreguntaDeMesa[] = []) {
  return {
    listarSesiones: vi.fn<ClienteDeMesa["listarSesiones"]>(async () => []),
    crearSesion: vi.fn<ClienteDeMesa["crearSesion"]>(async (datos) =>
      sesionDeLista({ id: "nueva", titulo: datos.titulo, modo: datos.modo }),
    ),
    leerInstitucion: vi.fn<ClienteDeMesa["leerInstitucion"]>(async () => INSTITUCION),
    buscarCruces: vi.fn<ClienteDeMesa["buscarCruces"]>(async () => []),
    reprogramar: vi.fn<ClienteDeMesa["reprogramar"]>(async () => undefined),
    cancelar: vi.fn<ClienteDeMesa["cancelar"]>(async () => undefined),
    iniciar: vi.fn<ClienteDeMesa["iniciar"]>(async () => undefined),
    terminar: vi.fn<ClienteDeMesa["terminar"]>(async () => undefined),
    generarCodigos: vi.fn<ClienteDeMesa["generarCodigos"]>(async (_id, cantidad) =>
      Array.from({ length: cantidad }, (_, i) => `AAAA-${String(1000 + i)}`),
    ),
    listarPreguntas: vi.fn<ClienteDeMesa["listarPreguntas"]>(async () => preguntas),
    crearPregunta: vi.fn<ClienteDeMesa["crearPregunta"]>(async () => undefined),
    abrirPregunta: vi.fn<ClienteDeMesa["abrirPregunta"]>(async () => undefined),
    cerrarPregunta: vi.fn<ClienteDeMesa["cerrarPregunta"]>(async () => RESULTADO),
    anularPregunta: vi.fn<ClienteDeMesa["anularPregunta"]>(async () => undefined),
    proyectarPregunta: vi.fn<ClienteDeMesa["proyectarPregunta"]>(async () => undefined),
    darLaPalabra: vi.fn<ClienteDeMesa["darLaPalabra"]>(async () => undefined),
    terminarIntervencion: vi.fn<ClienteDeMesa["terminarIntervencion"]>(async () => undefined),
    sumarMinuto: vi.fn<ClienteDeMesa["sumarMinuto"]>(async () => undefined),
    rechazarMocion: vi.fn<ClienteDeMesa["rechazarMocion"]>(async () => undefined),
    leerActa: vi.fn<ClienteDeMesa["leerActa"]>(async () => {
      throw new Error("sin acta");
    }),
    guardarActa: vi.fn<ClienteDeMesa["guardarActa"]>(async () => undefined),
    finalizarActa: vi.fn<ClienteDeMesa["finalizarActa"]>(async () => "ABCDE-23456"),
    listarDecisiones: vi.fn<ClienteDeMesa["listarDecisiones"]>(async () => []),
    editarEnunciado: vi.fn<ClienteDeMesa["editarEnunciado"]>(async () => undefined),
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

export const RESULTADO: ResultadoDeVotacion = {
  totalVotos: 10,
  porOpcion: [
    { opcionId: "o1", texto: "Sí", votos: 7, porcentaje: 70 },
    { opcionId: "o2", texto: "No", votos: 3, porcentaje: 30 },
  ],
  ganadora: "o1",
  aprobada: true,
};

export const borrador: PreguntaDeMesa = {
  id: "p1",
  texto: "¿Aprueba el orden del día?",
  estado: "BORRADOR",
  resultadoProyectado: false,
  resultado: null,
  opciones: [
    { id: "o1", texto: "Sí" },
    { id: "o2", texto: "No" },
  ],
};
