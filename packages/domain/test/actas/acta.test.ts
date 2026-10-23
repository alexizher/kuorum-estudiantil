import { describe, expect, it } from "vitest";
import { Acta, CodigoDeVerificacion, type ContenidoDeActa } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

const contenido: ContenidoDeActa = {
  institucion: "Universidad",
  cuerpo: "Consejo general",
  titulo: "Asamblea",
  inicio: "2026-11-03T19:00:00.000Z",
  fin: "2026-11-03T21:00:00.000Z",
  zonaHoraria: "America/Bogota",
  modalidad: "PRESENCIAL",
  lugar: null,
  ordenDelDia: ["Apertura"],
  asistentes: 12,
  intervenciones: 3,
  mociones: { ORDEN: 1, PROCEDIMIENTO: 0, ACLARACION: 0, SUFICIENTE_ILUSTRACION: 0 },
  desarrollo: "Texto",
  decisiones: [],
};
const codigo = CodigoDeVerificacion.crear("K7F2A9QH3B");
const ahora = new Date("2026-11-04T10:00:00Z");

describe("Acta", () => {
  it("nace en borrador y se edita", () => {
    const acta = Acta.borrador("s-1");
    expect(acta.estado).toBe("BORRADOR");
    expect(acta.codigo).toBeNull();
    acta.editar("Hola");
    expect(acta.desarrollo).toBe("Hola");
  });

  it("rechaza un desarrollo de más de 20.000 caracteres", () => {
    expect(codigoDeError(() => Acta.borrador("s-1").editar("a".repeat(20_001)))).toBe(
      "DESARROLLO_INVALIDO",
    );
  });

  it("finaliza y guarda la foto", () => {
    const acta = Acta.borrador("s-1");
    acta.finalizar(contenido, codigo, ahora);
    expect(acta.estado).toBe("FINAL");
    expect(acta.codigo?.valor).toBe("K7F2A-9QH3B");
    expect(acta.finalizadaEn).toBe(ahora);
    expect(acta.contenido).toEqual(contenido);
  });

  it("no se edita tras finalizar y el texto no cambia", () => {
    const acta = Acta.borrador("s-1");
    acta.editar("Original");
    acta.finalizar(contenido, codigo, ahora);
    expect(codigoDeError(() => acta.editar("Otro"))).toBe("ACTA_FINALIZADA");
    expect(acta.desarrollo).toBe("Original");
  });

  it("no se finaliza dos veces", () => {
    const acta = Acta.borrador("s-1");
    acta.finalizar(contenido, codigo, ahora);
    expect(codigoDeError(() => acta.finalizar(contenido, codigo, ahora))).toBe("ACTA_FINALIZADA");
  });
});
