import { ErrorDeDominio } from "../errores.js";
import type { GeneradorDeIds } from "../generador-de-ids.js";
import type { Reloj } from "../reloj.js";
import { Opcion } from "./opcion.js";

const TEXTO_MIN = 5;
const TEXTO_MAX = 300;
const OPCIONES_MIN = 2;
const OPCIONES_MAX = 10;

export type EstadoDePregunta = "BORRADOR" | "ABIERTA" | "CERRADA" | "ANULADA";

export interface PropiedadesDePregunta {
  id: string;
  sesionId: string;
  texto: string;
  opciones: readonly Opcion[];
  estado: EstadoDePregunta;
  abiertaEn: Date | null;
  cerradaEn: Date | null;
  resultadoVisible: boolean;
}

export class Pregunta {
  readonly secreta = true;
  private _estado: EstadoDePregunta;
  private _abiertaEn: Date | null;
  private _cerradaEn: Date | null;
  private _resultadoVisible: boolean;

  private constructor(
    readonly id: string,
    readonly sesionId: string,
    readonly texto: string,
    readonly opciones: readonly Opcion[],
    estado: EstadoDePregunta,
    abiertaEn: Date | null,
    cerradaEn: Date | null,
    resultadoVisible: boolean,
  ) {
    this._estado = estado;
    this._abiertaEn = abiertaEn;
    this._cerradaEn = cerradaEn;
    this._resultadoVisible = resultadoVisible;
  }

  static nueva(
    sesionId: string,
    texto: string,
    textosDeOpciones: string[],
    generadorDeIds: GeneradorDeIds,
  ): Pregunta {
    const id = generadorDeIds.nuevo();
    const opciones = textosDeOpciones.map(
      (textoOpcion, orden) => new Opcion(generadorDeIds.nuevo(), textoOpcion, orden),
    );
    return Pregunta.reconstruir({
      id,
      sesionId,
      texto,
      opciones,
      estado: "BORRADOR",
      abiertaEn: null,
      cerradaEn: null,
      resultadoVisible: false,
    });
  }

  static reconstruir(props: PropiedadesDePregunta): Pregunta {
    const texto = props.texto.trim();
    if (texto.length < TEXTO_MIN || texto.length > TEXTO_MAX) {
      throw new ErrorDeDominio("TEXTO_PREGUNTA_INVALIDO");
    }
    if (props.opciones.length < OPCIONES_MIN || props.opciones.length > OPCIONES_MAX) {
      throw new ErrorDeDominio("OPCIONES_INVALIDAS");
    }
    const textosUnicos = new Set(props.opciones.map((o) => o.texto.toLowerCase()));
    if (textosUnicos.size !== props.opciones.length) {
      throw new ErrorDeDominio("OPCIONES_DUPLICADAS");
    }
    return new Pregunta(
      props.id,
      props.sesionId,
      texto,
      props.opciones,
      props.estado,
      props.abiertaEn,
      props.cerradaEn,
      props.resultadoVisible,
    );
  }

  get estado(): EstadoDePregunta {
    return this._estado;
  }

  get abiertaEn(): Date | null {
    return this._abiertaEn;
  }

  get cerradaEn(): Date | null {
    return this._cerradaEn;
  }

  get resultadoVisible(): boolean {
    return this._resultadoVisible;
  }

  abrir(reloj: Reloj): void {
    if (this._estado !== "BORRADOR") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "ABIERTA";
    this._abiertaEn = reloj.ahora();
  }

  cerrar(reloj: Reloj): void {
    if (this._estado !== "ABIERTA") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "CERRADA";
    this._cerradaEn = reloj.ahora();
  }

  anular(): void {
    if (this._estado !== "BORRADOR" && this._estado !== "ABIERTA") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "ANULADA";
  }

  exigirOpcion(opcionId: string): void {
    if (!this.opciones.some((o) => o.id === opcionId)) {
      throw new ErrorDeDominio("OPCION_INVALIDA");
    }
  }

  exigirAbierta(): void {
    if (this._estado !== "ABIERTA") {
      throw new ErrorDeDominio("PREGUNTA_CERRADA");
    }
  }

  proyectarResultado(): void {
    if (this._estado !== "CERRADA") {
      throw new ErrorDeDominio("PREGUNTA_NO_CERRADA");
    }
    this._resultadoVisible = true;
  }
}
