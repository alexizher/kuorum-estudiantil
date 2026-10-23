export type ModoDeSala = "SALA_ABIERTA" | "CON_CODIGOS";
export type Modalidad = "PRESENCIAL" | "VIRTUAL" | "MIXTA";

export interface SesionDeLista {
  id: string;
  titulo: string;
  codigoDeSala: string;
  estado: string;
  modo: ModoDeSala;
  creadaEn: string;
  cuerpo: { id: string; nombre: string };
  inicio: string;
  fin: string;
  /** Hora local de la institución, `2026-11-03T14:00`. */
  inicioLocal: string;
  finLocal: string;
  modalidad: Modalidad;
  lugar: string | null;
  /** Puede reprogramarla o cancelarla. */
  puedeGestionar: boolean;
}

/** Cuándo y dónde es la sesión, como lo prepara el servidor para la mesa. */
export interface ProgramacionDeSesion {
  cuerpo: string;
  inicioLocal: string;
  finLocal: string;
  modalidad: Modalidad;
  lugar: string | null;
  ordenDelDia: string[];
  puedeGestionar: boolean;
}

export interface CuerpoDeMesa {
  id: string;
  nombre: string;
  slug: string;
  tipo: "GENERAL" | "FACULTAD";
  archivado: boolean;
  puedeProgramar: boolean;
}

export interface InstitucionDeMesa {
  institucion: {
    nombre: string;
    tipoDeCuerpoSingular: string;
    tipoDeCuerpoPlural: string;
    zonaHoraria: string;
    logoUrl: string | null;
    colorPrimario: string | null;
    colorSecundario: string | null;
    pieDePagina: string | null;
    textoBienvenida: string | null;
    proveedorOAuth: "microsoft" | "google" | null;
    clientIdOAuth: string | null;
    clientSecretOAuth: string | null;
  };
  cuerpos: CuerpoDeMesa[];
}

export interface CruceDeSesion {
  id: string;
  titulo: string;
  cuerpo: string;
  inicioLocal: string;
  finLocal: string;
}

export interface CambiosDeSesion {
  titulo?: string;
  inicio?: string;
  fin?: string;
  modalidad?: Modalidad;
  lugar?: string | null;
  ordenDelDia?: string[];
}

export interface ResultadoDeVotacion {
  totalVotos: number;
  porOpcion: { opcionId: string; texto: string; votos: number; porcentaje: number }[];
  ganadora: string | null;
  aprobada: boolean | null;
}

export interface PreguntaDeMesa {
  id: string;
  texto: string;
  estado: "BORRADOR" | "ABIERTA" | "CERRADA" | "ANULADA";
  resultadoProyectado: boolean;
  /** Solo las cerradas: la mesa lo ve antes de proyectarlo. */
  resultado: ResultadoDeVotacion | null;
  opciones: { id: string; texto: string }[];
}

export interface DatosDeSesion {
  titulo: string;
  modo: ModoDeSala;
  segundosPorIntervencion?: number;
  cuerpoId: string;
  inicio: string;
  fin: string;
  modalidad: Modalidad;
  lugar?: string | null;
  ordenDelDia?: string[];
}

export interface DecisionDeMesa {
  id: string;
  preguntaId: string;
  pregunta: string;
  enunciado: string | null;
  aprobada: boolean | null;
  indicativa: boolean;
  resultado: unknown;
}

/** Lo que el acta dice al finalizar, armado por el servidor. */
export interface ContenidoDeActaDeMesa {
  institucion: string;
  cuerpo: string;
  titulo: string;
  inicio: string;
  fin: string;
  zonaHoraria: string;
  modalidad: Modalidad;
  lugar: string | null;
  ordenDelDia: string[];
  asistentes: number | null;
  intervenciones: number;
  mociones: Record<string, number>;
  desarrollo: string;
  decisiones: {
    pregunta: string;
    enunciado: string | null;
    aprobada: boolean | null;
    indicativa: boolean;
  }[];
}

export interface ActaDeMesa {
  estado: "BORRADOR" | "FINAL";
  desarrollo: string;
  codigo: string | null;
  finalizadaEn: string | null;
  vistaPrevia: ContenidoDeActaDeMesa;
}

/** Acciones de la mesa. Todas lanzan ErrorDeMesa si algo falla. */
export interface ClienteDeMesa {
  listarSesiones(opciones?: { incluirCuentaDePrueba?: boolean }): Promise<SesionDeLista[]>;
  crearSesion(datos: DatosDeSesion): Promise<SesionDeLista>;
  leerInstitucion(): Promise<InstitucionDeMesa>;
  buscarCruces(tramo: { inicio: string; fin: string; excluir?: string }): Promise<CruceDeSesion[]>;
  reprogramar(sesionId: string, cambios: CambiosDeSesion): Promise<void>;
  cancelar(sesionId: string): Promise<void>;
  iniciar(sesionId: string): Promise<void>;
  terminar(sesionId: string): Promise<void>;
  /** El texto plano de los códigos solo existe en esta respuesta. */
  generarCodigos(sesionId: string, cantidad: number): Promise<string[]>;
  listarPreguntas(sesionId: string): Promise<PreguntaDeMesa[]>;
  /** Sin opciones, la API usa Sí, No y Me abstengo. */
  crearPregunta(sesionId: string, texto: string, opciones?: string[]): Promise<void>;
  abrirPregunta(preguntaId: string): Promise<void>;
  /** Devuelve el conteo de la votación recién cerrada. */
  cerrarPregunta(preguntaId: string): Promise<ResultadoDeVotacion>;
  anularPregunta(preguntaId: string): Promise<void>;
  proyectarPregunta(preguntaId: string): Promise<void>;
  /** Sin solicitud da la palabra a la siguiente de la fila. */
  darLaPalabra(sesionId: string, solicitudId?: string): Promise<void>;
  terminarIntervencion(sesionId: string): Promise<void>;
  sumarMinuto(sesionId: string): Promise<void>;
  rechazarMocion(sesionId: string, solicitudId: string): Promise<void>;
  leerActa(sesionId: string): Promise<ActaDeMesa>;
  guardarActa(sesionId: string, desarrollo: string): Promise<void>;
  /** Devuelve el código de verificación. */
  finalizarActa(sesionId: string): Promise<string>;
  listarDecisiones(sesionId: string): Promise<DecisionDeMesa[]>;
  /** null borra el enunciado. */
  editarEnunciado(decisionId: string, enunciado: string | null): Promise<void>;
}

const MENSAJE_POR_CODIGO: Readonly<Record<string, string>> = {
  SIN_CONEXION: "No hay conexión. Revisa tu red e inténtalo de nuevo.",
  NO_AUTENTICADO: "Tu sesión venció. Vuelve a ingresar.",
  SOLICITUD_INVALIDA: "Revisa los datos e inténtalo de nuevo.",
  OTRA_PREGUNTA_ABIERTA: "Ya hay otra votación abierta. Ciérrala o anúlala primero.",
  TRANSICION_INVALIDA: "La sala no puede pasar a ese estado ahora.",
  SESION_CON_VOTACION_ABIERTA: "Cierra la votación abierta antes de terminar la sesión.",
  SESION_NO_EN_CURSO: "La sesión todavía no está en curso. Iníciala primero.",
  SESION_NO_DISPONIBLE: "La sesión ya terminó.",
  SESION_NO_ENCONTRADA: "No encontramos esa sesión.",
  PREGUNTA_NO_ENCONTRADA: "No encontramos esa pregunta.",
  FILA_VACIA: "No hay nadie en la fila.",
  NADIE_CON_LA_PALABRA: "Nadie tiene la palabra ahora.",
  SOLICITUD_NO_DISPONIBLE: "Esa solicitud ya no está en la fila.",
  TEXTO_PREGUNTA_INVALIDO: "La pregunta debe tener entre 5 y 300 caracteres.",
  OPCIONES_INVALIDAS: "Las opciones van de 2 a 10.",
  OPCIONES_DUPLICADAS: "Las opciones no pueden repetirse.",
  TEXTO_OPCION_INVALIDO: "Cada opción debe tener entre 1 y 80 caracteres.",
  ACTA_FINALIZADA: "El acta ya está finalizada y no se puede cambiar.",
  HORARIO_INVALIDO:
    "La hora de fin tiene que ser después del inicio, y la sesión puede durar hasta 24 horas.",
};
const MENSAJE_GENERAL = "No se pudo completar. Inténtalo de nuevo.";

export class ErrorDeMesa extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje?: string,
  ) {
    super(mensaje ?? MENSAJE_POR_CODIGO[codigo] ?? MENSAJE_GENERAL);
    this.name = "ErrorDeMesa";
  }
}

export function comoErrorDeMesa(error: unknown): ErrorDeMesa {
  return error instanceof ErrorDeMesa ? error : new ErrorDeMesa(0, "ERROR_INESPERADO");
}

const MESA = "/api/mesa/v1";

export type MetodoHttp = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Pide a la API de la mesa. Devuelve el JSON (o null si no hay cuerpo) y traduce los fallos a
 * ErrorDeMesa, con el mensaje de la API si lo trae.
 */
export async function pedirJson(
  fetch: typeof globalThis.fetch,
  metodo: MetodoHttp,
  url: string,
  cuerpo?: unknown,
): Promise<unknown> {
  let respuesta: Response;
  try {
    const conCuerpo = metodo !== "GET" && metodo !== "DELETE";
    // Llamada suelta: window.fetch lanza "Illegal invocation" si `this` es otra instancia.
    respuesta = await fetch(url, {
      method: metodo,
      credentials: "same-origin",
      ...(conCuerpo
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo ?? {}) }
        : {}),
    });
  } catch {
    throw new ErrorDeMesa(0, "SIN_CONEXION");
  }
  const json: unknown = await respuesta.json().catch(() => null);
  if (respuesta.ok) return json;
  const { error, mensaje } = (json ?? {}) as { error?: unknown; mensaje?: unknown };
  throw new ErrorDeMesa(
    respuesta.status,
    typeof error === "string" ? error : "ERROR_DE_RED",
    typeof mensaje === "string" ? mensaje : undefined,
  );
}

function leer<T>(cuerpo: unknown, campo: string): T {
  const valor = (cuerpo as Record<string, unknown> | null)?.[campo];
  if (valor === undefined || valor === null) throw new ErrorDeMesa(0, "RESPUESTA_INVALIDA");
  return valor as T;
}

export class ClienteDeMesaPorFetch implements ClienteDeMesa {
  constructor(private readonly fetch: typeof globalThis.fetch) {}

  async listarSesiones(
    opciones: { incluirCuentaDePrueba?: boolean } = {},
  ): Promise<SesionDeLista[]> {
    const ruta = `${MESA}/sesiones${opciones.incluirCuentaDePrueba ? "?incluirPrueba=1" : ""}`;
    const lista = leer<unknown>(await this.pedir("GET", ruta), "sesiones");
    if (!Array.isArray(lista)) throw new ErrorDeMesa(0, "RESPUESTA_INVALIDA");
    return lista as SesionDeLista[];
  }

  async crearSesion(datos: DatosDeSesion): Promise<SesionDeLista> {
    return (await this.pedir("POST", `${MESA}/sesiones`, datos)) as SesionDeLista;
  }

  async leerInstitucion(): Promise<InstitucionDeMesa> {
    const cuerpo = await this.pedir("GET", `${MESA}/institucion`);
    leer<unknown>(cuerpo, "cuerpos");
    return cuerpo as InstitucionDeMesa;
  }

  async buscarCruces(tramo: {
    inicio: string;
    fin: string;
    excluir?: string;
  }): Promise<CruceDeSesion[]> {
    const consulta = new URLSearchParams({ inicio: tramo.inicio, fin: tramo.fin });
    if (tramo.excluir !== undefined) consulta.set("excluir", tramo.excluir);
    return leer<CruceDeSesion[]>(await this.pedir("GET", `${MESA}/cruces?${consulta}`), "cruces");
  }

  async reprogramar(sesionId: string, cambios: CambiosDeSesion): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "reprogramar"), cambios);
  }

  async cancelar(sesionId: string): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "cancelar"));
  }

  async iniciar(sesionId: string): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "iniciar"));
  }

  async terminar(sesionId: string): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "terminar"));
  }

  async generarCodigos(sesionId: string, cantidad: number): Promise<string[]> {
    const cuerpo = await this.pedir("POST", this.sesion(sesionId, "codigos"), { cantidad });
    return leer<string[]>(cuerpo, "codigos");
  }

  async listarPreguntas(sesionId: string): Promise<PreguntaDeMesa[]> {
    const lista = leer<unknown>(
      await this.pedir("GET", this.sesion(sesionId, "preguntas")),
      "preguntas",
    );
    if (!Array.isArray(lista)) throw new ErrorDeMesa(0, "RESPUESTA_INVALIDA");
    return lista as PreguntaDeMesa[];
  }

  async crearPregunta(sesionId: string, texto: string, opciones?: string[]): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "preguntas"), {
      texto,
      ...(opciones === undefined ? {} : { opciones }),
    });
  }

  async abrirPregunta(preguntaId: string): Promise<void> {
    await this.pedir("POST", this.pregunta(preguntaId, "abrir"));
  }

  async cerrarPregunta(preguntaId: string): Promise<ResultadoDeVotacion> {
    const cuerpo = await this.pedir("POST", this.pregunta(preguntaId, "cerrar"));
    if (cuerpo === null || typeof cuerpo !== "object") {
      throw new ErrorDeMesa(0, "RESPUESTA_INVALIDA");
    }
    return cuerpo as ResultadoDeVotacion;
  }

  async anularPregunta(preguntaId: string): Promise<void> {
    await this.pedir("POST", this.pregunta(preguntaId, "anular"));
  }

  async proyectarPregunta(preguntaId: string): Promise<void> {
    await this.pedir("POST", this.pregunta(preguntaId, "proyectar"));
  }

  async darLaPalabra(sesionId: string, solicitudId?: string): Promise<void> {
    await this.pedir(
      "POST",
      this.sesion(sesionId, "palabra/dar"),
      solicitudId === undefined ? {} : { solicitudId },
    );
  }

  async terminarIntervencion(sesionId: string): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "palabra/terminar"));
  }

  async sumarMinuto(sesionId: string): Promise<void> {
    await this.pedir("POST", this.sesion(sesionId, "palabra/minuto"));
  }

  async rechazarMocion(sesionId: string, solicitudId: string): Promise<void> {
    await this.pedir(
      "POST",
      this.sesion(sesionId, `mociones/${encodeURIComponent(solicitudId)}/rechazar`),
    );
  }

  async leerActa(sesionId: string): Promise<ActaDeMesa> {
    const cuerpo = await this.pedir("GET", this.sesion(sesionId, "acta"));
    leer<unknown>(cuerpo, "vistaPrevia");
    return cuerpo as ActaDeMesa;
  }

  async guardarActa(sesionId: string, desarrollo: string): Promise<void> {
    await this.pedir("PUT", this.sesion(sesionId, "acta"), { desarrollo });
  }

  async finalizarActa(sesionId: string): Promise<string> {
    return leer<string>(
      await this.pedir("POST", this.sesion(sesionId, "acta/finalizar")),
      "codigo",
    );
  }

  async listarDecisiones(sesionId: string): Promise<DecisionDeMesa[]> {
    const lista = leer<unknown>(
      await this.pedir("GET", this.sesion(sesionId, "decisiones")),
      "decisiones",
    );
    if (!Array.isArray(lista)) throw new ErrorDeMesa(0, "RESPUESTA_INVALIDA");
    return lista as DecisionDeMesa[];
  }

  async editarEnunciado(decisionId: string, enunciado: string | null): Promise<void> {
    await this.pedir("PATCH", `${MESA}/decisiones/${encodeURIComponent(decisionId)}`, {
      enunciado,
    });
  }

  private sesion(id: string, ruta: string): string {
    return `${MESA}/sesiones/${encodeURIComponent(id)}/${ruta}`;
  }

  private pregunta(id: string, ruta: string): string {
    return `${MESA}/preguntas/${encodeURIComponent(id)}/${ruta}`;
  }

  private pedir(metodo: MetodoHttp, url: string, cuerpo?: unknown): Promise<unknown> {
    return pedirJson(this.fetch, metodo, url, cuerpo);
  }
}
