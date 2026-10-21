import type { TipoDeMocion } from "@kuorum/domain";

export type EntradaDeIngreso = { codigo: string } | { tokenNavegador: string };

/** Acciones del participante sobre una sala. Todas lanzan ErrorDeAccion si algo falla. */
export interface ClienteDeSala {
  ingresar(codigoDeSala: string, entrada: EntradaDeIngreso): Promise<void>;
  votar(codigoDeSala: string, preguntaId: string, opcionId: string): Promise<void>;
  /** Devuelve el id de la solicitud. */
  pedirPalabra(codigoDeSala: string, nombreVisible: string): Promise<string>;
  /** Devuelve el id de la solicitud. */
  presentarMocion(codigoDeSala: string, nombreVisible: string, tipo: TipoDeMocion): Promise<string>;
  retirar(codigoDeSala: string, solicitudId: string): Promise<void>;
}

/** Textos para cuando la API no manda `mensaje`. */
const MENSAJE_POR_CODIGO: Readonly<Record<string, string>> = {
  SIN_CONEXION: "No hay conexión. Revisa tu red e inténtalo de nuevo.",
  SIN_INGRESO: "Tu ingreso a la sala venció. Escribe tu código otra vez.",
  DEMASIADAS_SOLICITUDES: "Demasiados intentos seguidos. Espera un momento.",
  OPCION_INVALIDA: "Esa opción ya no está disponible. Elige otra.",
  CODIGO_DE_ACCESO_INVALIDO: "El código tiene dos grupos de 4 caracteres, como ABCD-EFGH.",
  SALA_NO_DISPONIBLE: "Esta sala no existe o ya terminó.",
  YA_EN_LA_FILA: "Ya estás en la fila.",
};
const MENSAJE_GENERAL = "No se pudo completar. Inténtalo de nuevo.";

export class ErrorDeAccion extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje?: string,
  ) {
    super(mensaje ?? MENSAJE_POR_CODIGO[codigo] ?? MENSAJE_GENERAL);
    this.name = "ErrorDeAccion";
  }
}

export function comoErrorDeAccion(error: unknown): ErrorDeAccion {
  return error instanceof ErrorDeAccion ? error : new ErrorDeAccion(0, "ERROR_INESPERADO");
}

const SALAS = "/api/public/v1/salas";

export class ClienteDeSalaPorFetch implements ClienteDeSala {
  constructor(private readonly fetch: typeof globalThis.fetch) {}

  async ingresar(codigoDeSala: string, entrada: EntradaDeIngreso): Promise<void> {
    await this.enviar(codigoDeSala, "ingresar", entrada);
  }

  async votar(codigoDeSala: string, preguntaId: string, opcionId: string): Promise<void> {
    await this.enviar(codigoDeSala, "votos", { preguntaId, opcionId });
  }

  async pedirPalabra(codigoDeSala: string, nombreVisible: string): Promise<string> {
    return this.solicitud(await this.enviar(codigoDeSala, "palabra", { nombreVisible }));
  }

  async presentarMocion(
    codigoDeSala: string,
    nombreVisible: string,
    tipo: TipoDeMocion,
  ): Promise<string> {
    return this.solicitud(await this.enviar(codigoDeSala, "mociones", { nombreVisible, tipo }));
  }

  async retirar(codigoDeSala: string, solicitudId: string): Promise<void> {
    await this.pedir(
      `${SALAS}/${encodeURIComponent(codigoDeSala)}/solicitudes/${encodeURIComponent(solicitudId)}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      },
    );
  }

  private enviar(codigoDeSala: string, accion: string, cuerpo: unknown): Promise<unknown> {
    return this.pedir(`${SALAS}/${encodeURIComponent(codigoDeSala)}/${accion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      credentials: "same-origin",
    });
  }

  private solicitud(cuerpo: unknown): string {
    const id = (cuerpo as { solicitudId?: unknown } | null)?.solicitudId;
    if (typeof id !== "string") throw new ErrorDeAccion(0, "RESPUESTA_INVALIDA");
    return id;
  }

  /** Devuelve el cuerpo JSON (o null si no hay) y traduce los fallos a ErrorDeAccion. */
  private async pedir(url: string, opciones: RequestInit): Promise<unknown> {
    let respuesta: Response;
    try {
      // Llamada suelta: window.fetch lanza "Illegal invocation" si `this` es la instancia.
      const llamar = this.fetch;
      respuesta = await llamar(url, opciones);
    } catch {
      throw new ErrorDeAccion(0, "SIN_CONEXION");
    }
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    if (respuesta.ok) return cuerpo;
    const { error, mensaje } = (cuerpo ?? {}) as { error?: unknown; mensaje?: unknown };
    throw new ErrorDeAccion(
      respuesta.status,
      typeof error === "string" ? error : "ERROR_DE_RED",
      typeof mensaje === "string" ? mensaje : undefined,
    );
  }
}
