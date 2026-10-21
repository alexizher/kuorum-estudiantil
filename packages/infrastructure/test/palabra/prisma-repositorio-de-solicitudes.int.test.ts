import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SolicitudDePalabra } from "@kuorum/domain";
import { crearBanco, limpiar, participanteDePrueba, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

async function escenario() {
  const sesion = sesionDePrueba();
  await banco.sesiones.guardar(sesion);
  const participante = await banco.participantes.crear(participanteDePrueba(sesion.id));
  return { sesion, participante };
}

function solicitud(
  sesionId: string,
  participanteId: string,
  extra: Partial<Parameters<typeof SolicitudDePalabra.reconstruir>[0]> = {},
) {
  return SolicitudDePalabra.reconstruir({
    id: randomUUID(),
    sesionId,
    participanteId,
    nombreVisible: "Camila",
    tipo: "INTERVENCION",
    mocion: null,
    estado: "ESPERANDO",
    pedidaEn: new Date("2026-10-20T15:02:00.000Z"),
    inicioEn: null,
    finEn: null,
    segundosExtra: 0,
    ...extra,
  });
}

describe("PrismaRepositorioDeSolicitudes", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("guarda y recupera una solicitud con todos sus campos", async () => {
    const { sesion, participante } = await escenario();
    const original = solicitud(sesion.id, participante.id, {
      tipo: "MOCION",
      mocion: "ORDEN",
      estado: "CON_LA_PALABRA",
      inicioEn: new Date("2026-10-20T15:03:00.000Z"),
      segundosExtra: 60,
    });
    await banco.solicitudes.guardar(original);

    const leida = await banco.solicitudes.porId(original.id);

    expect(leida).toBeInstanceOf(SolicitudDePalabra);
    expect(leida).toMatchObject({
      id: original.id,
      sesionId: sesion.id,
      participanteId: participante.id,
      nombreVisible: "Camila",
      tipo: "MOCION",
      mocion: "ORDEN",
      estado: "CON_LA_PALABRA",
      segundosExtra: 60,
      finEn: null,
    });
    expect(leida?.pedidaEn).toEqual(original.pedidaEn);
    expect(leida?.inicioEn).toEqual(original.inicioEn);
    expect(await banco.solicitudes.porId("no-existe")).toBeNull();
  });

  it("guardar de nuevo actualiza el estado", async () => {
    const { sesion, participante } = await escenario();
    const original = solicitud(sesion.id, participante.id);
    await banco.solicitudes.guardar(original);
    const cargada = await banco.solicitudes.porId(original.id);
    cargada?.darLaPalabra({ ahora: () => new Date("2026-10-20T15:04:00.000Z") });
    cargada?.sumarSegundos(60);
    if (cargada) await banco.solicitudes.guardar(cargada);

    const final = await banco.solicitudes.porId(original.id);
    expect(final).toMatchObject({ estado: "CON_LA_PALABRA", segundosExtra: 60 });
    expect(final?.inicioEn).toEqual(new Date("2026-10-20T15:04:00.000Z"));
    expect(await banco.prisma.solicitudDePalabra.count()).toBe(1);
  });

  it("deSesion devuelve solo las de la sesión, por hora de petición", async () => {
    const { sesion, participante } = await escenario();
    const otra = await escenario();
    const tarde = solicitud(sesion.id, participante.id, {
      pedidaEn: new Date("2026-10-20T15:09:00.000Z"),
    });
    const temprano = solicitud(sesion.id, participante.id, {
      pedidaEn: new Date("2026-10-20T15:01:00.000Z"),
    });
    const ajena = solicitud(otra.sesion.id, otra.participante.id);
    for (const s of [tarde, temprano, ajena]) await banco.solicitudes.guardar(s);

    const lista = await banco.solicitudes.deSesion(sesion.id);

    expect(lista.map((s) => s.id)).toEqual([temprano.id, tarde.id]);
  });
});
