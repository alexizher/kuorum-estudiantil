import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { ContenidoDeActa } from "@kuorum/domain";
import { generarPdfDelActa } from "@/actas/pdf-del-acta";

function contenido(desarrollo: string, extra: Partial<ContenidoDeActa> = {}): ContenidoDeActa {
  return {
    institucion: "Universidad Ejemplo",
    cuerpo: "Consejo Estudiantil de Ingeniería",
    titulo: "Sesión ordinaria de noviembre: año nuevo, Ñandú",
    inicio: "2026-11-03T19:00:00.000Z",
    fin: "2026-11-03T21:00:00.000Z",
    zonaHoraria: "America/Bogota",
    modalidad: "MIXTA",
    lugar: "Auditorio Mayor",
    ordenDelDia: ["Verificación", "Informe de tesorería", "Proposiciones"],
    asistentes: 142,
    intervenciones: 9,
    mociones: { ORDEN: 2, PROCEDIMIENTO: 0, ACLARACION: 1, SUFICIENTE_ILUSTRACION: 1 },
    desarrollo,
    decisiones: [
      {
        pregunta: "¿Aprueba el presupuesto de la jornada deportiva interfacultades 2027?",
        enunciado: "Se aprueba el presupuesto presentado.",
        aprobada: true,
        indicativa: false,
        resultado: {
          totalVotos: 100,
          asistentes: 142,
          porOpcion: [
            {
              texto: "Sí, con todas las observaciones " + "largas ".repeat(10),
              votos: 70,
              porcentaje: 70,
            },
            { texto: "No", votos: 30, porcentaje: 30 },
          ],
        },
      },
      {
        pregunta: "Consulta",
        enunciado: null,
        aprobada: null,
        indicativa: true,
        resultado: { totalVotos: 0, asistentes: null, porOpcion: [] },
      },
    ],
    ...extra,
  };
}

describe("generarPdfDelActa", () => {
  it("genera un PDF válido de una página con desarrollo corto", async () => {
    const bytes = await generarPdfDelActa(
      contenido("Se abrió la sesión."),
      "ABCDE-FGHJK",
      "https://x.test/actas/verificar",
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("un desarrollo de 12.000 caracteres ocupa más de una página", async () => {
    const parrafo = "Intervención de la mesa sobre el punto tratado con detalle. "
      .repeat(10)
      .trim();
    const desarrollo = Array.from({ length: 20 }, () => parrafo)
      .join("\n\n")
      .slice(0, 12_000);
    const bytes = await generarPdfDelActa(contenido(desarrollo), "ABCDE-FGHJK", "https://x.test/v");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("no falla con emoji, sin asistencia ni lugar", async () => {
    const bytes = await generarPdfDelActa(
      contenido("Hola 🎉", {
        asistentes: null,
        lugar: null,
        modalidad: "VIRTUAL",
        ordenDelDia: [],
      }),
      "ABCDE-FGHJK",
      "https://x.test/v",
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
