import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  NOMBRE_DE_MOCION,
  aHoraLocal,
  type ContenidoDeActa,
  type TipoDeMocion,
} from "@kuorum/domain";
import { aWinAnsi, partirEnLineas, textoDeAsistencia } from "./texto-del-pdf";

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 56;
const TAMANO = 11;
const INTERLINEA = 15;
const ZONA_DEL_PIE = 40;
const ANCHO_UTIL = ANCHO - 2 * MARGEN;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MODALIDADES = { PRESENCIAL: "Presencial", VIRTUAL: "Virtual", MIXTA: "Mixta" } as const;

function fechaEnEspanol(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number) as [number, number, number];
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

class Hoja {
  private pagina: PDFPage;
  private y: number;
  readonly paginas: PDFPage[] = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly normal: PDFFont,
    private readonly negrita: PDFFont,
  ) {
    this.pagina = this.nuevaPagina();
    this.y = ALTO - MARGEN;
  }

  private nuevaPagina(): PDFPage {
    const pagina = this.doc.addPage([ANCHO, ALTO]);
    this.paginas.push(pagina);
    return pagina;
  }

  espacio(puntos: number): void {
    this.y -= puntos;
  }

  parrafo(
    texto: string,
    opciones: { negrita?: boolean; tamano?: number; sangria?: number } = {},
  ): void {
    const fuente = opciones.negrita ? this.negrita : this.normal;
    const tamano = opciones.tamano ?? TAMANO;
    const sangria = opciones.sangria ?? 0;
    const medir = (t: string) => fuente.widthOfTextAtSize(t, tamano);
    for (const linea of partirEnLineas(aWinAnsi(texto), ANCHO_UTIL - sangria, medir)) {
      this.linea(linea, fuente, tamano, MARGEN + sangria);
    }
  }

  /** Fila de tabla: texto a la izquierda (partido) y valor alineado a la derecha. */
  fila(texto: string, valor: string): void {
    const medir = (t: string) => this.normal.widthOfTextAtSize(t, TAMANO);
    const anchoValor = medir(aWinAnsi(valor));
    const lineas = partirEnLineas(aWinAnsi(texto), ANCHO_UTIL - 24 - anchoValor - 12, medir);
    lineas.forEach((linea, i) => {
      this.linea(linea, this.normal, TAMANO, MARGEN + 12, i === 0 ? aWinAnsi(valor) : undefined);
    });
  }

  private linea(texto: string, fuente: PDFFont, tamano: number, x: number, derecha?: string): void {
    if (this.y - INTERLINEA < MARGEN + ZONA_DEL_PIE) {
      this.pagina = this.nuevaPagina();
      this.y = ALTO - MARGEN;
    }
    this.y -= INTERLINEA;
    this.pagina.drawText(texto, { x, y: this.y, size: tamano, font: fuente });
    if (derecha !== undefined) {
      const ancho = this.normal.widthOfTextAtSize(derecha, TAMANO);
      this.pagina.drawText(derecha, {
        x: ANCHO - MARGEN - ancho,
        y: this.y,
        size: TAMANO,
        font: this.normal,
      });
    }
  }
}

function partesDeFecha(c: ContenidoDeActa): string {
  const inicio = aHoraLocal(new Date(c.inicio), c.zonaHoraria);
  const fin = aHoraLocal(new Date(c.fin), c.zonaHoraria);
  const horas = `${inicio.hora} a ${fin.hora}`;
  return inicio.fecha === fin.fecha
    ? `${fechaEnEspanol(inicio.fecha)}, ${horas}`
    : `${fechaEnEspanol(inicio.fecha)} ${inicio.hora} a ${fechaEnEspanol(fin.fecha)} ${fin.hora}`;
}

function porcentaje(valor: number): string {
  return `${Number.isInteger(valor) ? valor : valor.toFixed(1).replace(".", ",")} %`;
}

function escribirEncabezado(h: Hoja, c: ContenidoDeActa): void {
  h.parrafo(c.institucion, { negrita: true, tamano: 13 });
  h.parrafo(c.cuerpo);
  h.espacio(10);
  h.parrafo(c.titulo, { negrita: true, tamano: 16 });
  h.espacio(6);
  h.parrafo(partesDeFecha(c));
  const lugar = c.lugar ? ` · ${c.lugar}` : "";
  h.parrafo(`Modalidad: ${MODALIDADES[c.modalidad]}${lugar}`);
}

function escribirOrdenYDatos(h: Hoja, c: ContenidoDeActa): void {
  if (c.ordenDelDia.length > 0) {
    h.espacio(10);
    h.parrafo("Orden del día", { negrita: true, tamano: 12 });
    c.ordenDelDia.forEach((punto, i) => h.parrafo(`${i + 1}. ${punto}`, { sangria: 12 }));
  }
  h.espacio(10);
  h.parrafo(textoDeAsistencia(c.asistentes));
  h.parrafo(`Intervenciones: ${c.intervenciones}`);
  const tipos = Object.keys(c.mociones) as TipoDeMocion[];
  const mociones = tipos.map((t) => `${NOMBRE_DE_MOCION[t]}: ${c.mociones[t]}`).join(" · ");
  h.parrafo(`Mociones: ${mociones}`);
}

function escribirDesarrollo(h: Hoja, c: ContenidoDeActa): void {
  const parrafos = c.desarrollo.split(/\r?\n/);
  if (parrafos.every((p) => p.trim() === "")) return;
  h.espacio(10);
  h.parrafo("Desarrollo", { negrita: true, tamano: 12 });
  h.espacio(2);
  for (const p of parrafos) {
    if (p.trim() === "") h.espacio(INTERLINEA / 2);
    else h.parrafo(p);
  }
}

function escribirDecisiones(h: Hoja, c: ContenidoDeActa): void {
  if (c.decisiones.length === 0) return;
  h.espacio(10);
  h.parrafo("Decisiones", { negrita: true, tamano: 12 });
  c.decisiones.forEach((d, i) => {
    h.espacio(6);
    h.parrafo(`${i + 1}. ${d.pregunta}`, { negrita: true });
    if (d.enunciado) h.parrafo(d.enunciado, { sangria: 12 });
    for (const o of d.resultado.porOpcion) {
      h.fila(o.texto, `${o.votos} votos · ${porcentaje(o.porcentaje)}`);
    }
    const estado =
      d.aprobada === null ? "Sin regla de aprobación" : d.aprobada ? "Aprobada" : "No aprobada";
    h.parrafo(d.indicativa ? `${estado} · Votación indicativa` : estado, { sangria: 12 });
  });
}

function escribirPies(h: Hoja, fuente: PDFFont, codigo: string, url: string): void {
  const total = h.paginas.length;
  h.paginas.forEach((pagina, i) => {
    const pie = aWinAnsi(`Código de verificación: ${codigo} · Verifica en ${url}`);
    const numero = `Página ${i + 1} de ${total}`;
    const tamano = 8.5;
    const color = rgb(0.25, 0.25, 0.25);
    const lineas = partirEnLineas(pie, ANCHO_UTIL, (t) => fuente.widthOfTextAtSize(t, tamano));
    lineas.forEach((l, j) => {
      pagina.drawText(l, { x: MARGEN, y: MARGEN - 4 - j * 11, size: tamano, font: fuente, color });
    });
    const ancho = fuente.widthOfTextAtSize(numero, tamano);
    pagina.drawText(numero, {
      x: ANCHO - MARGEN - ancho,
      y: MARGEN - 4 - lineas.length * 11,
      size: tamano,
      font: fuente,
      color,
    });
  });
}

export async function generarPdfDelActa(
  contenido: ContenidoDeActa,
  codigo: string,
  urlDeVerificacion: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const hoja = new Hoja(doc, normal, negrita);
  escribirEncabezado(hoja, contenido);
  escribirOrdenYDatos(hoja, contenido);
  escribirDesarrollo(hoja, contenido);
  escribirDecisiones(hoja, contenido);
  escribirPies(hoja, normal, codigo, urlDeVerificacion);
  return doc.save();
}
