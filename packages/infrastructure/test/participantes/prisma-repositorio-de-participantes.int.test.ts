import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GenerarCodigosDeAcceso, IngresarASala } from "@kuorum/application";
import { RelojSistema } from "../helpers/reloj.js";
import { HasheadorSha256 } from "../../src/crypto/hasheador-sha256.js";
import { GeneradorDeCodigosAleatorio } from "../../src/codigos/generador-aleatorio.js";
import { GeneradorDeIdsUuid } from "../../src/crypto/generador-de-ids-uuid.js";
import { crearBanco, limpiar, participanteDePrueba, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

async function sesionGuardada(modo: "SALA_ABIERTA" | "CON_CODIGOS" = "SALA_ABIERTA") {
  const sesion = sesionDePrueba({ modo });
  await banco.sesiones.guardar(sesion);
  return sesion;
}

describe("PrismaRepositorioDeParticipantes", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("crea y recupera un participante por id y por credencial", async () => {
    const sesion = await sesionGuardada();
    const participante = participanteDePrueba(sesion.id, "h1");

    const creado = await banco.participantes.crear(participante);

    expect(creado).toEqual(participante);
    expect(await banco.participantes.porId(participante.id)).toEqual(participante);
    expect(await banco.participantes.porCredencial(sesion.id, "h1")).toEqual(participante);
    expect(await banco.participantes.porCredencial(sesion.id, "otro")).toBeNull();
    expect(await banco.participantes.porId("no-existe")).toBeNull();
  });

  it("crear con la misma credencial devuelve al existente en vez de fallar", async () => {
    const sesion = await sesionGuardada();
    const primero = await banco.participantes.crear(participanteDePrueba(sesion.id, "h1"));

    const segundo = await banco.participantes.crear(participanteDePrueba(sesion.id, "h1"));

    expect(segundo.id).toBe(primero.id);
    expect(await banco.prisma.participante.count()).toBe(1);
  });

  it("dos primeras entradas simultáneas con la misma credencial dejan un solo participante", async () => {
    const sesion = await sesionGuardada();

    const [a, b] = await Promise.all([
      banco.unidad.ejecutar(() => banco.participantes.crear(participanteDePrueba(sesion.id, "h1"))),
      banco.unidad.ejecutar(() => banco.participantes.crear(participanteDePrueba(sesion.id, "h1"))),
    ]);

    expect(a.id).toBe(b.id);
    expect(await banco.prisma.participante.count()).toBe(1);
  });

  it("IngresarASala simultáneo con el mismo token deja un participante y ambos reciben su id", async () => {
    const sesion = await sesionGuardada();
    const ingresar = new IngresarASala(
      banco.sesiones,
      banco.participantes,
      banco.unidad,
      new HasheadorSha256(),
      new GeneradorDeIdsUuid(),
      new RelojSistema(),
    );
    const credencial = {
      tipo: "NAVEGADOR",
      token: "3f2b8c1e-5d4a-4b7e-9c0a-1d2e3f4a5b6c",
    } as const;

    const [a, b] = await Promise.all([
      ingresar.ejecutar(sesion.codigoDeSala.valor, credencial),
      ingresar.ejecutar(sesion.codigoDeSala.valor, credencial),
    ]);

    expect(a.participanteId).toBe(b.participanteId);
    expect(await banco.prisma.participante.count()).toBe(1);
  });

  it("IngresarASala simultáneo con el mismo código activa una vez y da un participante", async () => {
    const sesion = await sesionGuardada("CON_CODIGOS");
    const hasheador = new HasheadorSha256();
    const generar = new GenerarCodigosDeAcceso(
      banco.sesiones,
      banco.participantes,
      banco.unidad,
      new GeneradorDeCodigosAleatorio(),
      hasheador,
    );
    const [codigo = ""] = await generar.ejecutar(
      { id: "u-super", rol: "SUPERADMIN", membresias: [] },
      sesion.id,
      1,
    );
    const ingresar = new IngresarASala(
      banco.sesiones,
      banco.participantes,
      banco.unidad,
      hasheador,
      new GeneradorDeIdsUuid(),
      new RelojSistema(),
    );

    const [a, b] = await Promise.all([
      ingresar.ejecutar(sesion.codigoDeSala.valor, { tipo: "CODIGO", codigo }),
      ingresar.ejecutar(sesion.codigoDeSala.valor, { tipo: "CODIGO", codigo }),
    ]);

    expect(a.participanteId).toBe(b.participanteId);
    expect(await banco.prisma.participante.count()).toBe(1);
    expect(await banco.participantes.contarActivos(sesion.id)).toBe(1);
    expect((await banco.sesiones.porId(sesion.id))?.version).toBe(1);
  });

  describe("códigos de acceso", () => {
    it("guarda solo hashes y no deja el texto plano en ninguna tabla", async () => {
      const sesion = await sesionGuardada("CON_CODIGOS");
      const hasheador = new HasheadorSha256();
      const plano = "ABCD-2345";
      await banco.participantes.guardarCodigos(sesion.id, [hasheador.sha256(plano)]);

      const filas = await banco.prisma.codigoDeAcceso.findMany();
      expect(filas).toHaveLength(1);
      expect(filas[0]?.hash).toMatch(/^[0-9a-f]{64}$/);
      const volcado = JSON.stringify({
        codigos: filas,
        participantes: await banco.prisma.participante.findMany(),
      });
      expect(volcado).not.toContain(plano);
      expect(volcado).not.toContain("ABCD2345");
    });

    it("un hash repetido en la sesión falla con CODIGO_DUPLICADO y no guarda nada", async () => {
      const sesion = await sesionGuardada("CON_CODIGOS");
      await banco.participantes.guardarCodigos(sesion.id, ["a", "b"]);

      await expect(banco.participantes.guardarCodigos(sesion.id, ["c", "b"])).rejects.toMatchObject(
        {
          codigo: "CODIGO_DUPLICADO",
        },
      );
      expect(await banco.prisma.codigoDeAcceso.count()).toBe(2);
    });

    it("el mismo hash en otra sesión no es duplicado", async () => {
      const una = await sesionGuardada("CON_CODIGOS");
      const otra = await sesionGuardada("CON_CODIGOS");
      await banco.participantes.guardarCodigos(una.id, ["a"]);
      await banco.participantes.guardarCodigos(otra.id, ["a"]);
      expect(await banco.prisma.codigoDeAcceso.count()).toBe(2);
    });

    it("activarCodigo distingue ACTIVADO, YA_ACTIVO y NO_EXISTE", async () => {
      const sesion = await sesionGuardada("CON_CODIGOS");
      await banco.participantes.guardarCodigos(sesion.id, ["a"]);

      expect(await banco.participantes.activarCodigo(sesion.id, "a")).toBe("ACTIVADO");
      expect(await banco.participantes.activarCodigo(sesion.id, "a")).toBe("YA_ACTIVO");
      expect(await banco.participantes.activarCodigo(sesion.id, "z")).toBe("NO_EXISTE");
    });

    it("activación simultánea del mismo código: exactamente uno recibe ACTIVADO", async () => {
      const sesion = await sesionGuardada("CON_CODIGOS");
      await banco.participantes.guardarCodigos(sesion.id, ["a"]);

      const resultados = await Promise.all(
        Array.from({ length: 6 }, () => banco.participantes.activarCodigo(sesion.id, "a")),
      );

      expect(resultados.filter((r) => r === "ACTIVADO")).toHaveLength(1);
      expect(resultados.filter((r) => r === "YA_ACTIVO")).toHaveLength(5);
    });

    it("contarActivos cuenta códigos activados, no participantes ni códigos sin usar", async () => {
      const sesion = await sesionGuardada("CON_CODIGOS");
      await banco.participantes.guardarCodigos(sesion.id, ["a", "b", "c"]);
      await banco.participantes.activarCodigo(sesion.id, "a");
      await banco.participantes.activarCodigo(sesion.id, "b");
      await banco.participantes.crear(participanteDePrueba(sesion.id, "n1"));
      await banco.participantes.crear(participanteDePrueba(sesion.id, "n2"));
      await banco.participantes.crear(participanteDePrueba(sesion.id, "n3"));

      expect(await banco.participantes.contarActivos(sesion.id)).toBe(2);
    });
  });

  it("contarCodigos cuenta todos los códigos de la sesión, activados o no, y solo los suyos", async () => {
    const sesion = await sesionGuardada("CON_CODIGOS");
    const otra = await sesionGuardada("CON_CODIGOS");
    await banco.participantes.guardarCodigos(sesion.id, ["a", "b", "c"]);
    await banco.participantes.guardarCodigos(otra.id, ["a"]);
    await banco.participantes.activarCodigo(sesion.id, "a");

    expect(await banco.participantes.contarCodigos(sesion.id)).toBe(3);
    expect(await banco.participantes.contarCodigos(otra.id)).toBe(1);
    expect(await banco.participantes.contarCodigos("nada")).toBe(0);
  });
});
