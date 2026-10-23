import { describe, expect, it } from "vitest";
import { Cuerpo } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

describe("Cuerpo", () => {
  it("deriva el slug del nombre sin tildes ni mayúsculas", () => {
    const cuerpo = Cuerpo.nuevo({ id: "c-1", nombre: "Facultad de Ingeniería", tipo: "FACULTAD" });
    expect(cuerpo.slug).toBe("facultad-de-ingenieria");
    expect(cuerpo.archivado).toBe(false);
  });

  it("colapsa espacios y símbolos en un solo guion y quita los de los bordes", () => {
    const cuerpo = Cuerpo.nuevo({
      id: "c-1",
      nombre: "  Ciencias  Exactas & Naturales ",
      tipo: "FACULTAD",
    });
    expect(cuerpo.nombre).toBe("Ciencias  Exactas & Naturales");
    expect(cuerpo.slug).toBe("ciencias-exactas-naturales");
  });

  it("corta el slug en 60 caracteres sin dejar un guion al final", () => {
    const cuerpo = Cuerpo.nuevo({ id: "c-1", nombre: `${"a".repeat(59)} b`, tipo: "FACULTAD" });
    expect(cuerpo.slug).toBe("a".repeat(59));
  });

  it.each(["ab", "  ", "x".repeat(121)])("rechaza el nombre %j", (nombre) => {
    expect(codigoDeError(() => Cuerpo.nuevo({ id: "c-1", nombre, tipo: "FACULTAD" }))).toBe(
      "NOMBRE_DE_CUERPO_INVALIDO",
    );
  });

  it("rechaza un nombre sin letras ni números", () => {
    expect(
      codigoDeError(() => Cuerpo.nuevo({ id: "c-1", nombre: "& & &", tipo: "FACULTAD" })),
    ).toBe("NOMBRE_DE_CUERPO_INVALIDO");
  });

  it("renombrar cambia nombre y slug", () => {
    const cuerpo = Cuerpo.nuevo({ id: "c-1", nombre: "Medicina", tipo: "FACULTAD" });
    cuerpo.renombrar("Facultad de Medicina");
    expect(cuerpo.nombre).toBe("Facultad de Medicina");
    expect(cuerpo.slug).toBe("facultad-de-medicina");
  });

  it("archiva una facultad", () => {
    const cuerpo = Cuerpo.nuevo({ id: "c-1", nombre: "Medicina", tipo: "FACULTAD" });
    cuerpo.archivar();
    expect(cuerpo.archivado).toBe(true);
  });

  it("no archiva la asamblea general", () => {
    const general = Cuerpo.nuevo({ id: "c-0", nombre: "Asamblea general", tipo: "GENERAL" });
    expect(codigoDeError(() => general.archivar())).toBe("GENERAL_NO_SE_ARCHIVA");
    expect(general.archivado).toBe(false);
  });

  it("reconstruir conserva el slug guardado", () => {
    const cuerpo = Cuerpo.reconstruir({
      id: "c-1",
      nombre: "Medicina",
      tipo: "FACULTAD",
      slug: "medicina",
      archivado: true,
    });
    expect(cuerpo.slug).toBe("medicina");
    expect(cuerpo.archivado).toBe(true);
  });
});
