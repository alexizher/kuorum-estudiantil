import { describe, expect, it } from "vitest";
import { Institucion, type PropiedadesDeInstitucion } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

const base = {
  nombre: "Universidad de Ejemplo",
  tipoDeCuerpoSingular: "Facultad",
  tipoDeCuerpoPlural: "Facultades",
  zonaHoraria: "America/Bogota",
  logoUrl: null,
  colorPrimario: null,
  colorSecundario: null,
  pieDePagina: null,
  textoBienvenida: null,
  proveedorOAuth: null,
  clientIdOAuth: null,
  clientSecretOAuth: null,
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
    [
      { proveedorOAuth: "github" } as unknown as Partial<PropiedadesDeInstitucion>,
      "PROVEEDOR_OAUTH_INVALIDO",
    ],
    [{ clientIdOAuth: "x".repeat(201) }, "CLIENT_ID_OAUTH_INVALIDO"],
    [{ clientSecretOAuth: "x".repeat(501) }, "CLIENT_SECRET_OAUTH_INVALIDO"],
  ])("rechaza %j con %s y no cambia nada", (cambios, codigo) => {
    const institucion = Institucion.reconstruir(base);
    expect(codigoDeError(() => institucion.configurar(cambios))).toBe(codigo);
    expect(institucion.nombre).toBe(base.nombre);
    expect(institucion.zonaHoraria).toBe(base.zonaHoraria);
  });

  it("acepta proveedores OAuth válidos", () => {
    const institucion = Institucion.reconstruir(base);
    institucion.configurar({
      proveedorOAuth: "microsoft",
      clientIdOAuth: "abc",
      clientSecretOAuth: "secret",
    });
    expect(institucion.proveedorOAuth).toBe("microsoft");
    expect(institucion.clientIdOAuth).toBe("abc");
    expect(institucion.clientSecretOAuth).toBe("secret");

    institucion.configurar({ proveedorOAuth: "google" });
    expect(institucion.proveedorOAuth).toBe("google");

    institucion.configurar({ proveedorOAuth: null });
    expect(institucion.proveedorOAuth).toBeNull();
  });
});
