import { describe, expect, it } from "vitest";
import { Institucion } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

const base = {
  nombre: "Universidad de Ejemplo",
  tipoDeCuerpoSingular: "Facultad",
  tipoDeCuerpoPlural: "Facultades",
  zonaHoraria: "America/Bogota",
};

describe("Institucion", () => {
  it("reconstruye con sus datos", () => {
    const institucion = Institucion.reconstruir(base);
    expect(institucion.nombre).toBe("Universidad de Ejemplo");
    expect(institucion.zonaHoraria).toBe("America/Bogota");
  });

  it("configurar cambia solo lo indicado, sin espacios en los bordes", () => {
    const institucion = Institucion.reconstruir(base);
    institucion.configurar({ tipoDeCuerpoSingular: " Escuela ", tipoDeCuerpoPlural: "Escuelas" });
    expect(institucion.tipoDeCuerpoSingular).toBe("Escuela");
    expect(institucion.tipoDeCuerpoPlural).toBe("Escuelas");
    expect(institucion.nombre).toBe("Universidad de Ejemplo");
  });

  it.each([
    [{ nombre: "U" }, "NOMBRE_DE_INSTITUCION_INVALIDO"],
    [{ tipoDeCuerpoSingular: "Fa" }, "TIPO_DE_CUERPO_INVALIDO"],
    [{ tipoDeCuerpoPlural: "x".repeat(41) }, "TIPO_DE_CUERPO_INVALIDO"],
    [{ zonaHoraria: "Marte/Olympus" }, "ZONA_HORARIA_INVALIDA"],
  ])("rechaza %j con %s y no cambia nada", (cambios, codigo) => {
    const institucion = Institucion.reconstruir(base);
    expect(codigoDeError(() => institucion.configurar(cambios))).toBe(codigo);
    expect(institucion.nombre).toBe(base.nombre);
    expect(institucion.zonaHoraria).toBe(base.zonaHoraria);
  });
});
