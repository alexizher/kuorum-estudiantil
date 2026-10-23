import { describe, expect, it } from "vitest";
import { seCruzan } from "../../src/index.js";

const tramo = (desde: string, hasta: string) => ({
  inicio: new Date(`2026-11-03T${desde}:00Z`),
  fin: new Date(`2026-11-03T${hasta}:00Z`),
});

describe("seCruzan", () => {
  it("dos sesiones seguidas no se cruzan", () => {
    expect(seCruzan(tramo("12:00", "14:00"), tramo("14:00", "16:00"))).toBe(false);
    expect(seCruzan(tramo("14:00", "16:00"), tramo("12:00", "14:00"))).toBe(false);
  });

  it("un minuto de más ya se cruza", () => {
    expect(seCruzan(tramo("12:00", "14:01"), tramo("14:00", "16:00"))).toBe(true);
  });

  it("una contenida en la otra se cruza", () => {
    expect(seCruzan(tramo("12:00", "18:00"), tramo("14:00", "15:00"))).toBe(true);
  });
});
