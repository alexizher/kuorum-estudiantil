import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Cuerpo } from "@kuorum/domain";
import {
  CUERPO_GENERAL,
  crearBanco,
  cuerpoDePrueba,
  limpiar,
  usuarioDePrueba,
} from "../helpers/sala.js";

const banco = crearBanco();

describe("institución, cuerpos, membresías y personal en Prisma", () => {
  beforeEach(() => limpiar(banco));
  afterAll(async () => {
    await banco.prisma.institucion.update({
      where: { id: "institucion" },
      data: {
        nombre: "Institución",
        tipoDeCuerpoSingular: "Facultad",
        tipoDeCuerpoPlural: "Facultades",
        zonaHoraria: "America/Bogota",
      },
    });
    await banco.prisma.$disconnect();
  });

  it("la migración deja la institución y la general", async () => {
    const institucion = await banco.institucion.obtener();
    expect(institucion.zonaHoraria).toBe("America/Bogota");
    const general = await banco.cuerpos.porId(CUERPO_GENERAL);
    expect(general).toMatchObject({ tipo: "GENERAL", slug: "asamblea-general", archivado: false });
  });

  it("guarda la institución configurada", async () => {
    const institucion = await banco.institucion.obtener();
    institucion.configurar({ nombre: "Universidad de Prueba", zonaHoraria: "America/Lima" });
    await banco.institucion.guardar(institucion);
    const leida = await banco.institucion.obtener();
    expect(leida.nombre).toBe("Universidad de Prueba");
    expect(leida.zonaHoraria).toBe("America/Lima");
  });

  it("guarda, renombra, archiva y lista cuerpos con la general primero y luego por nombre", async () => {
    const zoo = await cuerpoDePrueba(banco, "Zootecnia");
    const artes = await cuerpoDePrueba(banco, "Artes");
    const cuerpo = await banco.cuerpos.porId(artes);
    cuerpo?.renombrar("Facultad de Artes");
    cuerpo?.archivar();
    if (cuerpo) await banco.cuerpos.guardar(cuerpo);
    expect(await banco.cuerpos.porSlug("facultad-de-artes")).toMatchObject({
      id: artes,
      archivado: true,
    });
    expect((await banco.cuerpos.listar()).map((c) => c.id)).toEqual([CUERPO_GENERAL, artes, zoo]);
  });

  it("un segundo cuerpo GENERAL lo rechaza la base", async () => {
    await expect(
      banco.cuerpos.guardar(Cuerpo.nuevo({ id: "otra", nombre: "Otra general", tipo: "GENERAL" })),
    ).rejects.toThrow();
  });

  it("asignar dos veces cambia el rol, quitar la borra y borrar al usuario borra sus membresías", async () => {
    const persona = await usuarioDePrueba(banco, "MESA");
    const medicina = await cuerpoDePrueba(banco, "Medicina");
    await banco.membresias.asignar({ usuarioId: persona, cuerpoId: medicina, rol: "MESA" });
    await banco.membresias.asignar({ usuarioId: persona, cuerpoId: medicina, rol: "ENCARGADO" });
    await banco.membresias.asignar({ usuarioId: persona, cuerpoId: CUERPO_GENERAL, rol: "MESA" });
    expect(await banco.membresias.deUsuario(persona)).toHaveLength(2);
    expect(
      (await banco.membresias.deUsuario(persona)).find((m) => m.cuerpoId === medicina)?.rol,
    ).toBe("ENCARGADO");
    await banco.membresias.quitar(persona, CUERPO_GENERAL);
    await banco.membresias.quitar(persona, CUERPO_GENERAL);
    expect(await banco.membresias.deUsuario(persona)).toHaveLength(1);
    await banco.prisma.user.delete({ where: { id: persona } });
    expect(await banco.membresias.deUsuario(persona)).toEqual([]);
  });

  it("el directorio lista solo cuentas MESA, por nombre, con sus membresías", async () => {
    const beatriz = await usuarioDePrueba(banco, "MESA", "Beatriz");
    const ana = await usuarioDePrueba(banco, "MESA", "Ana");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    await usuarioDePrueba(banco, "DEMO");
    await banco.membresias.asignar({ usuarioId: ana, cuerpoId: CUERPO_GENERAL, rol: "ENCARGADO" });
    const lista = (await banco.directorio.listar()).filter((p) =>
      p.correo.endsWith("@usuarios-de-prueba.test"),
    );
    expect(lista.map((p) => p.id)).toEqual([ana, beatriz]);
    expect(lista[0]?.membresias).toEqual([
      { usuarioId: ana, cuerpoId: CUERPO_GENERAL, rol: "ENCARGADO" },
    ]);
    expect(await banco.directorio.existe(ana)).toBe(true);
    expect(await banco.directorio.existe(jefe)).toBe(false);
    expect(await banco.directorio.existe("nadie")).toBe(false);
  });
});
