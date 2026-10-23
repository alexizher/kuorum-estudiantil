import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Acta, CodigoDeVerificacion, type ContenidoDeActa, type Sesion } from "@kuorum/domain";
import {
  crearBanco,
  cuerpoDePrueba,
  limpiar,
  sesionDePrueba,
  usuarioDePrueba,
} from "../helpers/sala.js";

const banco = crearBanco();

const CONTENIDO: ContenidoDeActa = {
  institucion: "Institución",
  cuerpo: "Consejo",
  titulo: "Asamblea general",
  inicio: "2026-10-20T15:00:00.000Z",
  fin: "2026-10-20T17:00:00.000Z",
  zonaHoraria: "America/Bogota",
  modalidad: "PRESENCIAL",
  lugar: null,
  ordenDelDia: ["Saludo"],
  asistentes: 4,
  intervenciones: 2,
  mociones: { ORDEN: 1, PROCEDIMIENTO: 0, ACLARACION: 0, SUFICIENTE_ILUSTRACION: 0 },
  desarrollo: "Se habló de todo.\n\nSe votó.",
  decisiones: [],
};

async function finalDe(sesion: Sesion, codigo: string, finalizadaEn: Date): Promise<Acta> {
  await banco.sesiones.guardar(sesion);
  const acta = Acta.borrador(sesion.id);
  acta.editar("Se habló de todo.\n\nSe votó.");
  acta.finalizar(CONTENIDO, CodigoDeVerificacion.crear(codigo), finalizadaEn);
  await banco.actas.guardar(acta);
  return acta;
}

describe("PrismaRepositorioDeActas", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("guarda el borrador, lo actualiza y lo finaliza", async () => {
    const sesion = sesionDePrueba({ estado: "CERRADA" });
    await banco.sesiones.guardar(sesion);
    await banco.actas.guardar(Acta.borrador(sesion.id));
    const borrador = await banco.actas.deSesion(sesion.id);
    expect(borrador).toMatchObject({ estado: "BORRADOR", desarrollo: "", codigo: null });

    borrador?.editar("Texto");
    if (borrador) await banco.actas.guardar(borrador);
    expect((await banco.actas.deSesion(sesion.id))?.desarrollo).toBe("Texto");

    const final = await banco.actas.deSesion(sesion.id);
    const ahora = new Date("2026-10-20T18:00:00.000Z");
    final?.finalizar(CONTENIDO, CodigoDeVerificacion.crear("23456-789AB"), ahora);
    if (final) await banco.actas.guardar(final);
    const leida = await banco.actas.deSesion(sesion.id);
    expect(leida).toMatchObject({ estado: "FINAL", finalizadaEn: ahora, contenido: CONTENIDO });
    expect(leida?.codigo?.valor).toBe("23456-789AB");
  });

  it("devuelve null si no hay acta", async () => {
    expect(await banco.actas.deSesion("no-existe")).toBeNull();
  });

  it("busca por código, normalizado", async () => {
    const sesion = sesionDePrueba({ estado: "ACTA_FINAL" });
    await finalDe(sesion, "23456-789AB", new Date());
    const encontrada = await banco.actas.porCodigo(CodigoDeVerificacion.crear("23456789ab"));
    expect(encontrada?.sesionId).toBe(sesion.id);
    expect(await banco.actas.porCodigo(CodigoDeVerificacion.crear("CCCCC-CCCCC"))).toBeNull();
  });

  it("publicas filtra por final, cuerpo, rango y DEMO, y trae la sesión", async () => {
    const facultad = await cuerpoDePrueba(banco, "Facultad de prueba");
    const demo = await usuarioDePrueba(banco, "DEMO");
    const a = sesionDePrueba({ estado: "ACTA_FINAL" });
    const b = sesionDePrueba({ estado: "ACTA_FINAL", cuerpoId: facultad });
    const fuera = sesionDePrueba({ estado: "ACTA_FINAL" });
    const deDemo = sesionDePrueba({ estado: "ACTA_FINAL", creadaPorId: demo });
    const borrador = sesionDePrueba({ estado: "CERRADA" });
    await finalDe(a, "23456-789AB", new Date("2026-10-20T18:00:00Z"));
    await finalDe(b, "23456-789AC", new Date("2026-10-21T18:00:00Z"));
    await finalDe(fuera, "23456-789AD", new Date("2026-12-21T18:00:00Z"));
    await finalDe(deDemo, "23456-789AE", new Date("2026-10-20T18:00:00Z"));
    await banco.sesiones.guardar(borrador);
    await banco.actas.guardar(Acta.borrador(borrador.id));
    const rango = {
      desde: new Date("2026-10-01T00:00:00Z"),
      hasta: new Date("2026-11-01T00:00:00Z"),
    };

    const todas = await banco.actas.publicas(rango);
    expect(todas.map((x) => x.sesion.id)).toEqual([a.id, b.id]);
    expect(todas[0]?.acta.estado).toBe("FINAL");
    const una = await banco.actas.publicas({ ...rango, cuerpoId: facultad });
    expect(una.map((x) => x.sesion.id)).toEqual([b.id]);
  });

  it("borrar la sesión borra el acta", async () => {
    const sesion = sesionDePrueba({ estado: "ACTA_FINAL" });
    await finalDe(sesion, "23456-789AB", new Date());
    await banco.prisma.sesion.delete({ where: { id: sesion.id } });
    expect(await banco.actas.deSesion(sesion.id)).toBeNull();
  });
});
