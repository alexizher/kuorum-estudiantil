/** Lo que el `.ics` necesita de cada sesión. */
export interface SesionDelCalendario {
  id: string;
  titulo: string;
  cuerpo: { nombre: string; slug: string };
  inicio: Date;
  fin: Date;
  modalidad: string;
  lugar: string | null;
  estado: string;
}

export interface DatosDelIcs {
  institucion: string;
  /** Nombre del cuerpo si el calendario está filtrado. */
  cuerpo?: string;
  /** Dominio de la instalación: hace únicos los UID entre instalaciones. */
  host: string;
  generadoEn: Date;
  sesiones: readonly SesionDelCalendario[];
}

const LARGO_MAXIMO = 75;
const codificador = new TextEncoder();

/** RFC 5545, 3.3.11: barra, punto y coma, coma y saltos de línea. */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545, 3.1: líneas de hasta 75 octetos; las de continuación empiezan con un espacio.
 * Se corta entre caracteres, nunca en medio de uno de varios octetos.
 */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const caracter of linea) {
    const largo = codificador.encode(caracter).length;
    if (octetos + largo > LARGO_MAXIMO) {
      partes.push(actual);
      actual = ` ${caracter}`;
      octetos = 1 + largo;
    } else {
      actual += caracter;
      octetos += largo;
    }
  }
  partes.push(actual);
  return partes.join("\r\n");
}

function fechaUtc(instante: Date): string {
  return instante
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function generarIcs({
  institucion,
  cuerpo,
  host,
  generadoEn,
  sesiones,
}: DatosDelIcs): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kuorum Estudiantil//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(cuerpo === undefined ? institucion : `${institucion}: ${cuerpo}`)}`,
  ];
  for (const sesion of sesiones) {
    lineas.push(
      "BEGIN:VEVENT",
      `UID:${sesion.id}@${host}`,
      `DTSTAMP:${fechaUtc(generadoEn)}`,
      `DTSTART:${fechaUtc(sesion.inicio)}`,
      `DTEND:${fechaUtc(sesion.fin)}`,
      `SUMMARY:${escapar(`${sesion.titulo} (${sesion.cuerpo.nombre})`)}`,
      ...(sesion.lugar === null ? [] : [`LOCATION:${escapar(sesion.lugar)}`]),
      ...(sesion.estado === "CANCELADA" ? ["STATUS:CANCELLED"] : []),
      "END:VEVENT",
    );
  }
  lineas.push("END:VCALENDAR");
  return `${lineas.map(plegar).join("\r\n")}\r\n`;
}
