import { describe, expect, it } from "vitest";
import { fechaYHora, finLocal, inicioPorDefecto, separar } from "../../src/vistas/mesa/horario";

describe("horario del formulario", () => {
  it("el fin queda el mismo día si la hora es posterior", () => {
    expect(finLocal("2026-11-03", "14:00", "16:00")).toBe("2026-11-03T16:00");
  });

  it("si la hora de fin es igual o anterior, pasa al día siguiente", () => {
    expect(finLocal("2026-11-03", "23:30", "01:00")).toBe("2026-11-04T01:00");
    expect(finLocal("2026-12-31", "22:00", "22:00")).toBe("2027-01-01T22:00");
  });

  it("separa una hora local en fecha y hora", () => {
    expect(separar("2026-11-03T23:30")).toEqual({ fecha: "2026-11-03", hora: "23:30" });
  });

  it("muestra la fecha y la hora sin moverlas de zona", () => {
    expect(fechaYHora("2026-11-03T23:30")).toBe("3 nov 2026, 23:30");
    expect(fechaYHora("2026-01-01T00:00")).toBe("1 ene 2026, 00:00");
  });

  it("propone la próxima hora en punto, y dos horas de duración", () => {
    expect(inicioPorDefecto(new Date(2026, 10, 3, 9, 20))).toEqual({
      fecha: "2026-11-03",
      desde: "10:00",
      hasta: "12:00",
    });
    expect(inicioPorDefecto(new Date(2026, 10, 3, 23, 5))).toEqual({
      fecha: "2026-11-04",
      desde: "00:00",
      hasta: "02:00",
    });
  });
});
