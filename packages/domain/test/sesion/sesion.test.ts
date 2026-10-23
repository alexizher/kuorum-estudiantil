import { describe, expect, it } from "vitest";
import {
  CodigoDeAcceso,
  CodigoDeSala,
  ErrorDeDominio,
  Sesion,
  type GeneradorDeCodigos,
  type PropiedadesDeSesion,
} from "../../src/index.js";

const creadaEn = new Date("2026-10-19T12:00:00Z");

const generador: GeneradorDeCodigos = {
  codigoDeSala: () => CodigoDeSala.crear("K7F2"),
  codigoDeAcceso: () => CodigoDeAcceso.crear("K7F2-9QH3"),
};

const inicio = new Date("2026-11-03T19:00:00Z");
const fin = new Date("2026-11-03T21:00:00Z");

const horario = {
  cuerpoId: "c-general",
  inicio,
  fin,
  modalidad: "PRESENCIAL" as const,
};

const datosBase = {
  id: "s-1",
  titulo: "Asamblea de presupuesto",
  modo: "SALA_ABIERTA" as const,
  creadaEn,
  ...horario,
};

function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("La operación no lanzó error");
}

describe("Sesion.nueva", () => {
  it("nace PROGRAMADA, en versión 0, con código de sala del generador", () => {
    const sesion = Sesion.nueva(datosBase, generador);
    expect(sesion.id).toBe("s-1");
    expect(sesion.titulo).toBe("Asamblea de presupuesto");
    expect(sesion.codigoDeSala.valor).toBe("K7F2");
    expect(sesion.modo).toBe("SALA_ABIERTA");
    expect(sesion.estado).toBe("PROGRAMADA");
    expect(sesion.version).toBe(0);
    expect(sesion.creadaEn).toBe(creadaEn);
  });

  it("guarda quién la creó, o null si no se indica", () => {
    expect(Sesion.nueva(datosBase, generador).creadaPorId).toBeNull();
    expect(Sesion.nueva({ ...datosBase, creadaPorId: "u-1" }, generador).creadaPorId).toBe("u-1");
  });

  it("solo está activa mientras no esté cerrada, en acta final ni cancelada", () => {
    const base = Sesion.nueva(datosBase, generador);
    const conEstado = (estado: PropiedadesDeSesion["estado"]) =>
      Sesion.reconstruir({
        id: base.id,
        titulo: base.titulo,
        codigoDeSala: base.codigoDeSala,
        modo: base.modo,
        estado,
        segundosPorIntervencion: base.segundosPorIntervencion,
        version: 0,
        creadaEn,
        ...horario,
      });
    expect(
      (["PROGRAMADA", "ABIERTA", "EN_CURSO"] as const).map((e) => conEstado(e).activa),
    ).toEqual([true, true, true]);
    expect(
      (["CERRADA", "ACTA_FINAL", "CANCELADA"] as const).map((e) => conEstado(e).activa),
    ).toEqual([false, false, false]);
  });

  it("usa 180 segundos por intervención si no se indican", () => {
    expect(Sesion.nueva(datosBase, generador).segundosPorIntervencion).toBe(180);
  });

  it("conserva los segundos por intervención indicados", () => {
    const sesion = Sesion.nueva({ ...datosBase, segundosPorIntervencion: 60 }, generador);
    expect(sesion.segundosPorIntervencion).toBe(60);
  });

  it("quita espacios del título", () => {
    const sesion = Sesion.nueva({ ...datosBase, titulo: "  Acta  " }, generador);
    expect(sesion.titulo).toBe("Acta");
  });

  it.each(["", "  ", "ab", " a "])("rechaza el título %j con TITULO_INVALIDO", (titulo) => {
    expect(codigoDeError(() => Sesion.nueva({ ...datosBase, titulo }, generador))).toBe(
      "TITULO_INVALIDO",
    );
  });

  it("acepta títulos de 3 y 140 caracteres", () => {
    expect(Sesion.nueva({ ...datosBase, titulo: "abc" }, generador).titulo).toBe("abc");
    const largo = "x".repeat(140);
    expect(Sesion.nueva({ ...datosBase, titulo: largo }, generador).titulo).toBe(largo);
  });

  it("rechaza títulos de más de 140 caracteres", () => {
    const titulo = "x".repeat(141);
    expect(codigoDeError(() => Sesion.nueva({ ...datosBase, titulo }, generador))).toBe(
      "TITULO_INVALIDO",
    );
  });

  it.each([29, 901, 180.5, Number.NaN])(
    "rechaza %s segundos por intervención con SEGUNDOS_INVALIDOS",
    (segundosPorIntervencion) => {
      expect(
        codigoDeError(() => Sesion.nueva({ ...datosBase, segundosPorIntervencion }, generador)),
      ).toBe("SEGUNDOS_INVALIDOS");
    },
  );

  it("acepta los límites 30 y 900 segundos", () => {
    expect(
      Sesion.nueva({ ...datosBase, segundosPorIntervencion: 30 }, generador)
        .segundosPorIntervencion,
    ).toBe(30);
    expect(
      Sesion.nueva({ ...datosBase, segundosPorIntervencion: 900 }, generador)
        .segundosPorIntervencion,
    ).toBe(900);
  });
});

describe("transiciones de Sesion", () => {
  it("iniciar pasa de PROGRAMADA a EN_CURSO", () => {
    const sesion = Sesion.nueva(datosBase, generador);
    sesion.iniciar();
    expect(sesion.estado).toBe("EN_CURSO");
  });

  it("iniciar pasa de ABIERTA a EN_CURSO", () => {
    const sesion = Sesion.reconstruir({
      ...datosDeSesion(),
      estado: "ABIERTA",
    });
    sesion.iniciar();
    expect(sesion.estado).toBe("EN_CURSO");
  });

  it.each(["EN_CURSO", "CERRADA", "ACTA_FINAL", "CANCELADA"] as const)(
    "iniciar desde %s lanza TRANSICION_INVALIDA",
    (estado) => {
      const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
      expect(codigoDeError(() => sesion.iniciar())).toBe("TRANSICION_INVALIDA");
      expect(sesion.estado).toBe(estado);
    },
  );

  it("terminar pasa de EN_CURSO a CERRADA", () => {
    const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado: "EN_CURSO" });
    sesion.terminar();
    expect(sesion.estado).toBe("CERRADA");
  });

  it.each(["PROGRAMADA", "ABIERTA", "CERRADA", "ACTA_FINAL", "CANCELADA"] as const)(
    "terminar desde %s lanza TRANSICION_INVALIDA",
    (estado) => {
      const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
      expect(codigoDeError(() => sesion.terminar())).toBe("TRANSICION_INVALIDA");
      expect(sesion.estado).toBe(estado);
    },
  );
});

describe("Sesion.exigirEnCurso", () => {
  it("no lanza si la sesión está EN_CURSO", () => {
    const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado: "EN_CURSO" });
    expect(() => sesion.exigirEnCurso()).not.toThrow();
  });

  it.each(["PROGRAMADA", "ABIERTA", "CERRADA"] as const)(
    "lanza SESION_NO_EN_CURSO si está %s",
    (estado) => {
      const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
      expect(codigoDeError(() => sesion.exigirEnCurso())).toBe("SESION_NO_EN_CURSO");
    },
  );
});

describe("Sesion.registrarCambio", () => {
  it("incrementa la versión en uno por cada cambio", () => {
    const sesion = Sesion.nueva(datosBase, generador);
    sesion.registrarCambio();
    expect(sesion.version).toBe(1);
    sesion.registrarCambio();
    expect(sesion.version).toBe(2);
  });
});

describe("Sesion.reconstruir", () => {
  it("restaura todas las propiedades tal como vienen de persistencia", () => {
    const props = { ...datosDeSesion(), estado: "CERRADA" as const, version: 9 };
    const sesion = Sesion.reconstruir(props);
    expect(sesion.estado).toBe("CERRADA");
    expect(sesion.version).toBe(9);
    expect(sesion.codigoDeSala.valor).toBe("K7F2");
    expect(sesion.segundosPorIntervencion).toBe(180);
  });

  it("rechaza una versión negativa con VERSION_INVALIDA", () => {
    expect(codigoDeError(() => Sesion.reconstruir({ ...datosDeSesion(), version: -1 }))).toBe(
      "VERSION_INVALIDA",
    );
  });

  it("rechaza un título inválido con TITULO_INVALIDO", () => {
    expect(codigoDeError(() => Sesion.reconstruir({ ...datosDeSesion(), titulo: "ab" }))).toBe(
      "TITULO_INVALIDO",
    );
  });
});

function datosDeSesion() {
  return {
    id: "s-1",
    titulo: "Asamblea de presupuesto",
    codigoDeSala: CodigoDeSala.crear("K7F2"),
    modo: "SALA_ABIERTA" as const,
    estado: "PROGRAMADA" as const,
    segundosPorIntervencion: 180,
    version: 0,
    creadaEn,
    ...horario,
  };
}

describe("horario de la sesión", () => {
  it("guarda cuerpo, inicio, fin, modalidad y lugar", () => {
    const sesion = Sesion.nueva({ ...datosBase, lugar: "  Auditorio 10  " }, generador);
    expect(sesion.cuerpoId).toBe("c-general");
    expect(sesion.inicio).toEqual(inicio);
    expect(sesion.fin).toEqual(fin);
    expect(sesion.modalidad).toBe("PRESENCIAL");
    expect(sesion.lugar).toBe("Auditorio 10");
  });

  it("sin lugar, o con lugar en blanco, queda null", () => {
    expect(Sesion.nueva(datosBase, generador).lugar).toBeNull();
    expect(Sesion.nueva({ ...datosBase, lugar: "   " }, generador).lugar).toBeNull();
  });

  it("rechaza un lugar de más de 200 caracteres", () => {
    expect(
      codigoDeError(() => Sesion.nueva({ ...datosBase, lugar: "x".repeat(201) }, generador)),
    ).toBe("LUGAR_INVALIDO");
  });

  it("rechaza fin igual al inicio", () => {
    expect(codigoDeError(() => Sesion.nueva({ ...datosBase, fin: inicio }, generador))).toBe(
      "HORARIO_INVALIDO",
    );
  });

  it("rechaza fin antes del inicio", () => {
    const antes = new Date(inicio.getTime() - 60_000);
    expect(codigoDeError(() => Sesion.nueva({ ...datosBase, fin: antes }, generador))).toBe(
      "HORARIO_INVALIDO",
    );
  });

  it("acepta 24 horas y rechaza 25", () => {
    const hora = 3_600_000;
    const de24 = new Date(inicio.getTime() + 24 * hora);
    expect(Sesion.nueva({ ...datosBase, fin: de24 }, generador).fin).toEqual(de24);
    const de25 = new Date(inicio.getTime() + 25 * hora);
    expect(codigoDeError(() => Sesion.nueva({ ...datosBase, fin: de25 }, generador))).toBe(
      "HORARIO_INVALIDO",
    );
  });

  it("rechaza fechas inválidas", () => {
    expect(
      codigoDeError(() => Sesion.nueva({ ...datosBase, inicio: new Date(Number.NaN) }, generador)),
    ).toBe("HORARIO_INVALIDO");
  });

  it("no es de la cuenta de prueba salvo que se diga al reconstruir", () => {
    expect(Sesion.nueva(datosBase, generador).creadaPorDemo).toBe(false);
    expect(Sesion.reconstruir({ ...datosDeSesion(), creadaPorDemo: true }).creadaPorDemo).toBe(
      true,
    );
  });
});

describe("Sesion.reprogramar", () => {
  it("cambia título, horario, modalidad y lugar de una sesión programada", () => {
    const sesion = Sesion.nueva(datosBase, generador);
    const nuevoInicio = new Date("2026-11-05T14:00:00Z");
    const nuevoFin = new Date("2026-11-05T16:00:00Z");
    sesion.reprogramar({
      titulo: " Asamblea extraordinaria ",
      inicio: nuevoInicio,
      fin: nuevoFin,
      modalidad: "VIRTUAL",
      lugar: "https://meet.example/abc",
    });
    expect(sesion.titulo).toBe("Asamblea extraordinaria");
    expect(sesion.inicio).toEqual(nuevoInicio);
    expect(sesion.fin).toEqual(nuevoFin);
    expect(sesion.modalidad).toBe("VIRTUAL");
    expect(sesion.lugar).toBe("https://meet.example/abc");
  });

  it("lugar null lo borra y lo que no se indica queda igual", () => {
    const sesion = Sesion.nueva({ ...datosBase, lugar: "Auditorio" }, generador);
    sesion.reprogramar({ lugar: null });
    expect(sesion.lugar).toBeNull();
    expect(sesion.titulo).toBe("Asamblea de presupuesto");
    expect(sesion.inicio).toEqual(inicio);
  });

  it("revalida el horario con lo que no cambió y no deja nada a medias", () => {
    const sesion = Sesion.nueva(datosBase, generador);
    expect(
      codigoDeError(() =>
        sesion.reprogramar({ titulo: "Otro título", inicio: new Date("2026-11-03T22:00:00Z") }),
      ),
    ).toBe("HORARIO_INVALIDO");
    expect(sesion.inicio).toEqual(inicio);
    expect(sesion.titulo).toBe("Asamblea de presupuesto");
  });

  it.each(["ABIERTA", "EN_CURSO", "CERRADA", "CANCELADA"] as const)(
    "desde %s lanza TRANSICION_INVALIDA",
    (estado) => {
      const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
      expect(codigoDeError(() => sesion.reprogramar({ titulo: "Otro título" }))).toBe(
        "TRANSICION_INVALIDA",
      );
    },
  );
});

describe("Sesion.cancelar", () => {
  it.each(["PROGRAMADA", "ABIERTA"] as const)("desde %s queda CANCELADA", (estado) => {
    const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
    sesion.cancelar();
    expect(sesion.estado).toBe("CANCELADA");
    expect(sesion.activa).toBe(false);
  });

  it.each(["EN_CURSO", "CERRADA", "ACTA_FINAL", "CANCELADA"] as const)(
    "desde %s lanza TRANSICION_INVALIDA",
    (estado) => {
      const sesion = Sesion.reconstruir({ ...datosDeSesion(), estado });
      expect(codigoDeError(() => sesion.cancelar())).toBe("TRANSICION_INVALIDA");
    },
  );
});
