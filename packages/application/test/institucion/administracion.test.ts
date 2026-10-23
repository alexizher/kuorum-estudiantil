import { describe, expect, it } from "vitest";
import {
  ArchivarCuerpo,
  AsignarMembresia,
  ConfigurarInstitucion,
  CrearCuentaDePersonal,
  CrearCuerpo,
  ListarPersonal,
  QuitarMembresia,
  RenombrarCuerpo,
  RestablecerContrasena,
  type Actor,
} from "../../src/index.js";
import {
  CUERPO_GENERAL,
  CUERPO_INGENIERIA,
  demo,
  encargadoDeLaGeneral,
  superadmin,
} from "../dobles/actores.js";
import { crearEscenario } from "../dobles/escenario.js";
import {
  GeneradorDeContrasenasGuionado,
  PersonalEnMemoria,
  RepositorioDeMembresiasEnMemoria,
} from "../dobles/personal-en-memoria.js";

function montar() {
  const e = crearEscenario();
  const membresias = new RepositorioDeMembresiasEnMemoria();
  const personal = new PersonalEnMemoria(membresias);
  const contrasenas = new GeneradorDeContrasenasGuionado();
  return {
    e,
    membresias,
    personal,
    configurar: new ConfigurarInstitucion(e.institucion),
    crearCuerpo: new CrearCuerpo(e.cuerpos, e.ids),
    renombrar: new RenombrarCuerpo(e.cuerpos),
    archivar: new ArchivarCuerpo(e.cuerpos),
    asignar: new AsignarMembresia(membresias, personal, e.cuerpos),
    quitar: new QuitarMembresia(membresias),
    listar: new ListarPersonal(personal),
    crearCuenta: new CrearCuentaDePersonal(personal, contrasenas),
    restablecer: new RestablecerContrasena(personal, personal, contrasenas),
  };
}

describe("solo el administrador de la instalación", () => {
  it.each([
    ["DEMO", demo],
    ["personal", encargadoDeLaGeneral],
  ] as [string, Actor][])("%s recibe SOLO_ADMINISTRADOR en todos", async (_, actor) => {
    const m = montar();
    const intentos: Promise<unknown>[] = [
      m.configurar.ejecutar(actor, { nombre: "Otra" }),
      m.crearCuerpo.ejecutar(actor, "Artes"),
      m.renombrar.ejecutar(actor, CUERPO_INGENIERIA, "Ingenierías"),
      m.archivar.ejecutar(actor, CUERPO_INGENIERIA),
      m.asignar.ejecutar(actor, "u-1", CUERPO_INGENIERIA, "MESA"),
      m.quitar.ejecutar(actor, "u-1", CUERPO_INGENIERIA),
      m.listar.ejecutar(actor),
      m.crearCuenta.ejecutar(actor, "a@example.test", "Ana"),
      m.restablecer.ejecutar(actor, "u-1"),
    ];
    for (const intento of intentos) {
      await expect(intento).rejects.toMatchObject({ codigo: "SOLO_ADMINISTRADOR" });
    }
    expect(m.personal.cuentas.size).toBe(0);
    expect((await m.e.institucion.obtener()).nombre).toBe("Universidad de Ejemplo");
  });
});

describe("institución y cuerpos", () => {
  it("configura el nombre y el tipo de cuerpo", async () => {
    const m = montar();
    await m.configurar.ejecutar(superadmin, {
      nombre: "Universidad Nueva",
      tipoDeCuerpoSingular: "Escuela",
      tipoDeCuerpoPlural: "Escuelas",
    });
    const institucion = await m.e.institucion.obtener();
    expect(institucion.nombre).toBe("Universidad Nueva");
    expect(institucion.tipoDeCuerpoPlural).toBe("Escuelas");
  });

  it("crea una facultad y rechaza otra con el mismo slug", async () => {
    const m = montar();
    const artes = await m.crearCuerpo.ejecutar(superadmin, "Artes");
    expect(artes.tipo).toBe("FACULTAD");
    expect((await m.e.cuerpos.porSlug("artes"))?.id).toBe(artes.id);
    await expect(m.crearCuerpo.ejecutar(superadmin, "ARTES")).rejects.toMatchObject({
      codigo: "CUERPO_REPETIDO",
    });
  });

  it("renombrar a un nombre de otro cuerpo es CUERPO_REPETIDO; a sí mismo no", async () => {
    const m = montar();
    await expect(
      m.renombrar.ejecutar(superadmin, CUERPO_INGENIERIA, "Medicina"),
    ).rejects.toMatchObject({
      codigo: "CUERPO_REPETIDO",
    });
    await m.renombrar.ejecutar(superadmin, CUERPO_INGENIERIA, "INGENIERÍA");
    expect((await m.e.cuerpos.porId(CUERPO_INGENIERIA))?.nombre).toBe("INGENIERÍA");
  });

  it("archiva una facultad pero no la general, y un cuerpo que no existe es NO_EXISTE", async () => {
    const m = montar();
    await m.archivar.ejecutar(superadmin, CUERPO_INGENIERIA);
    expect((await m.e.cuerpos.porId(CUERPO_INGENIERIA))?.archivado).toBe(true);
    await expect(m.archivar.ejecutar(superadmin, CUERPO_GENERAL)).rejects.toMatchObject({
      codigo: "GENERAL_NO_SE_ARCHIVA",
    });
    await expect(m.archivar.ejecutar(superadmin, "nada")).rejects.toMatchObject({
      codigo: "NO_EXISTE",
    });
  });
});

describe("personal", () => {
  it("crea la cuenta con la contraseña generada y la devuelve una vez", async () => {
    const m = montar();
    const { usuarioId, contrasena } = await m.crearCuenta.ejecutar(
      superadmin,
      "ana@example.test",
      "Ana",
    );
    expect(contrasena).toBe("contrasena-generada-1");
    expect(m.personal.cuentas.get(usuarioId)?.contrasena).toBe(contrasena);
  });

  it("asignar MESA y luego ENCARGADO deja una sola membresía con ENCARGADO", async () => {
    const m = montar();
    const { usuarioId } = await m.crearCuenta.ejecutar(superadmin, "ana@example.test", "Ana");
    await m.asignar.ejecutar(superadmin, usuarioId, CUERPO_INGENIERIA, "MESA");
    await m.asignar.ejecutar(superadmin, usuarioId, CUERPO_INGENIERIA, "ENCARGADO");
    expect(await m.membresias.deUsuario(usuarioId)).toEqual([
      { usuarioId, cuerpoId: CUERPO_INGENIERIA, rol: "ENCARGADO" },
    ]);
    const lista = await m.listar.ejecutar(superadmin);
    expect(lista[0]?.membresias).toHaveLength(1);
    await m.quitar.ejecutar(superadmin, usuarioId, CUERPO_INGENIERIA);
    expect(await m.membresias.deUsuario(usuarioId)).toEqual([]);
  });

  it("asignar a quien no existe, o en un cuerpo que no existe, es NO_EXISTE", async () => {
    const m = montar();
    const { usuarioId } = await m.crearCuenta.ejecutar(superadmin, "ana@example.test", "Ana");
    await expect(
      m.asignar.ejecutar(superadmin, "u-nadie", CUERPO_INGENIERIA, "MESA"),
    ).rejects.toMatchObject({
      codigo: "NO_EXISTE",
    });
    await expect(m.asignar.ejecutar(superadmin, usuarioId, "nada", "MESA")).rejects.toMatchObject({
      codigo: "NO_EXISTE",
    });
  });

  it("restablece la contraseña de quien está en el directorio, y no de quien no", async () => {
    const m = montar();
    const { usuarioId } = await m.crearCuenta.ejecutar(superadmin, "ana@example.test", "Ana");
    const { contrasena } = await m.restablecer.ejecutar(superadmin, usuarioId);
    expect(contrasena).toBe("contrasena-generada-2");
    expect(m.personal.cuentas.get(usuarioId)?.contrasena).toBe(contrasena);
    await expect(m.restablecer.ejecutar(superadmin, superadmin.id)).rejects.toMatchObject({
      codigo: "NO_EXISTE",
    });
  });
});
