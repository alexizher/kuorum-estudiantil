import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  mesActual,
  mesDesplazado,
  rangoDelMes,
  semanasDelMes,
} from "@/calendario/vista-de-calendario";

const ZONA = "America/Bogota";
const sesion = (id: string, inicio: string) => ({ id, inicio: new Date(inicio) });

describe("vista de calendario", () => {
  it("el rango del mes va de la medianoche local del 1 a la del mes siguiente", () => {
    const { desde, hasta } = rangoDelMes("2026-11", ZONA);
    expect(desde.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("las semanas empiezan el lunes y cubren el mes completo", () => {
    const semanas = semanasDelMes("2026-11", [], ZONA);
    // El 1 de noviembre de 2026 es domingo: la primera semana empieza el lunes 26 de octubre.
    expect(semanas[0]?.[0]?.fecha).toBe("2026-10-26");
    expect(semanas[0]?.[6]?.fecha).toBe("2026-11-01");
    expect(semanas.at(-1)?.at(-1)?.fecha).toBe("2026-12-06");
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0]?.[0]?.delMes).toBe(false);
    expect(semanas[0]?.[6]?.delMes).toBe(true);
  });

  it("una sesión a las 23:30 del 3 en Bogotá queda en la celda del 3", () => {
    const semanas = semanasDelMes("2026-11", [sesion("noche", "2026-11-04T04:30:00Z")], ZONA);
    const dias = semanas.flat();
    expect(dias.find((d) => d.fecha === "2026-11-03")?.sesiones.map((s) => s.id)).toEqual([
      "noche",
    ]);
    expect(dias.find((d) => d.fecha === "2026-11-04")?.sesiones).toEqual([]);
  });

  it("agrupa por día local en orden", () => {
    const grupos = agruparPorDia(
      [sesion("a", "2026-11-04T04:30:00Z"), sesion("b", "2026-11-04T15:00:00Z")],
      ZONA,
    );
    expect(grupos.map((g) => [g.fecha, g.sesiones.map((s) => s.id)])).toEqual([
      ["2026-11-03", ["a"]],
      ["2026-11-04", ["b"]],
    ]);
  });

  it("mes actual en la zona y desplazamiento entre años", () => {
    expect(mesActual(new Date("2026-12-01T03:00:00Z"), ZONA)).toBe("2026-11");
    expect(mesDesplazado("2026-12", 1)).toBe("2027-01");
    expect(mesDesplazado("2026-01", -1)).toBe("2025-12");
  });
});
