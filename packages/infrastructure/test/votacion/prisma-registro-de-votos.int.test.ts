import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearBanco, limpiar, preguntaDePrueba, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

async function preguntaAbierta() {
  const sesion = sesionDePrueba();
  await banco.sesiones.guardar(sesion);
  const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
  await banco.preguntas.guardar(pregunta);
  const [si = "", no = ""] = pregunta.opciones.map((o) => o.id);
  return { sesion, pregunta, si, no };
}

const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe("PrismaRegistroDeVotos", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("emitir suma uno a la opción y registra quién votó", async () => {
    const { pregunta, si, no } = await preguntaAbierta();
    await banco.votos.emitir(pregunta.id, "p1", si);
    await banco.votos.emitir(pregunta.id, "p2", si);
    await banco.votos.emitir(pregunta.id, "p3", no);

    const conteos = await banco.votos.conteos(pregunta.id);
    expect(conteos.get(si)).toBe(2);
    expect(conteos.get(no)).toBe(1);
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(3);
  });

  it("el segundo voto del mismo participante falla con YA_VOTO y no cambia el total", async () => {
    const { pregunta, si, no } = await preguntaAbierta();
    await banco.votos.emitir(pregunta.id, "p1", si);

    await expect(banco.votos.emitir(pregunta.id, "p1", no)).rejects.toMatchObject({
      codigo: "YA_VOTO",
    });
    const conteos = await banco.votos.conteos(pregunta.id);
    expect(conteos.get(si)).toBe(1);
    expect(conteos.get(no)).toBe(0);
  });

  it("doble voto concurrente: total 1 y exactamente un YA_VOTO", async () => {
    const { pregunta, si } = await preguntaAbierta();

    const resultados = await Promise.allSettled([
      banco.votos.emitir(pregunta.id, "p1", si),
      banco.votos.emitir(pregunta.id, "p1", si),
    ]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected");
    expect(rechazo?.status === "rejected" && rechazo.reason).toMatchObject({ codigo: "YA_VOTO" });
    expect((await banco.votos.conteos(pregunta.id)).get(si)).toBe(1);
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(1);
  });

  it("muchos votantes distintos a la vez no pierden ninguna suma", async () => {
    const { pregunta, si } = await preguntaAbierta();

    await Promise.all(
      Array.from({ length: 25 }, () => banco.votos.emitir(pregunta.id, randomUUID(), si)),
    );

    expect((await banco.votos.conteos(pregunta.id)).get(si)).toBe(25);
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(25);
  });

  it("un voto que compite con el cierre: tras el cierre, emitir falla con PREGUNTA_CERRADA y los totales no cambian", async () => {
    const { pregunta, si } = await preguntaAbierta();
    let cierreTerminado = false;

    // El voto retiene el candado de la pregunta hasta confirmar; el cierre arranca mientras tanto.
    const votando = banco.unidad.ejecutar(async () => {
      await banco.votos.emitir(pregunta.id, "p1", si);
      await pausa(400);
      expect(cierreTerminado).toBe(false);
    });
    await pausa(150);
    const cerrando = (async () => {
      const cargada = await banco.preguntas.porId(pregunta.id);
      cargada?.cerrar({ ahora: () => new Date() });
      if (cargada) await banco.preguntas.guardar(cargada);
      cierreTerminado = true;
    })();
    await Promise.all([votando, cerrando]);

    await expect(banco.votos.emitir(pregunta.id, "p2", si)).rejects.toMatchObject({
      codigo: "PREGUNTA_CERRADA",
    });
    expect((await banco.votos.conteos(pregunta.id)).get(si)).toBe(1);
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(1);
  });

  it("votos y cierre lanzados a la vez: los totales siempre cuadran con los votos emitidos", async () => {
    const { pregunta, si } = await preguntaAbierta();
    const cargada = await banco.preguntas.porId(pregunta.id);
    cargada?.cerrar({ ahora: () => new Date() });

    const intentos = [
      ...Array.from({ length: 10 }, () => banco.votos.emitir(pregunta.id, randomUUID(), si)),
      cargada ? banco.preguntas.guardar(cargada) : Promise.resolve(),
      ...Array.from({ length: 10 }, () => banco.votos.emitir(pregunta.id, randomUUID(), si)),
    ];
    const resultados = await Promise.allSettled(intentos);

    for (const r of resultados) {
      if (r.status === "rejected") expect(r.reason).toMatchObject({ codigo: "PREGUNTA_CERRADA" });
    }
    const emitidos = await banco.votos.votosEmitidos(pregunta.id);
    expect((await banco.votos.conteos(pregunta.id)).get(si)).toBe(emitidos);
    await expect(banco.votos.emitir(pregunta.id, randomUUID(), si)).rejects.toMatchObject({
      codigo: "PREGUNTA_CERRADA",
    });
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(emitidos);
  });

  it("no se vota en una pregunta que no está ABIERTA", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const borrador = preguntaDePrueba(sesion.id);
    await banco.preguntas.guardar(borrador);

    await expect(
      banco.votos.emitir(borrador.id, "p1", borrador.opciones[0]?.id ?? ""),
    ).rejects.toMatchObject({ codigo: "PREGUNTA_CERRADA" });
    await expect(banco.votos.emitir("no-existe", "p1", "x")).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
  });

  it("una opción que no es de la pregunta falla con OPCION_INVALIDA y no deja el voto registrado", async () => {
    const { pregunta } = await preguntaAbierta();

    await expect(banco.votos.emitir(pregunta.id, "p1", "otra")).rejects.toMatchObject({
      codigo: "OPCION_INVALIDA",
    });
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(0);
  });

  it("votos_emitidos solo tiene preguntaId y participanteId (sin hora ni opción)", async () => {
    const columnas = await banco.prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'votos_emitidos'
      ORDER BY column_name`;
    expect(columnas.map((c) => c.column_name)).toEqual(["participanteId", "preguntaId"]);

    const conteos = await banco.prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conteos'
      ORDER BY column_name`;
    expect(conteos.map((c) => c.column_name)).toEqual(["opcionId", "preguntaId", "total"]);
  });

  it("ninguna tabla une al participante con la opción", async () => {
    const referencias = await banco.prisma.$queryRaw<{ origen: string; destino: string }[]>`
      SELECT tc.table_name AS origen, ccu.table_name AS destino
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('votos_emitidos', 'conteos')`;
    const destinos = referencias.map((r) => `${r.origen}->${r.destino}`).sort();
    expect(destinos).toEqual([
      "conteos->opciones",
      "conteos->preguntas",
      "votos_emitidos->preguntas",
    ]);
  });

  it("las filas vivas de conteo comparten un solo xmin (el del último votante)", async () => {
    const { pregunta, si, no } = await preguntaAbierta();
    for (const [participante, opcion] of [
      ["p1", si],
      ["p2", no],
      ["p3", si],
      ["p4", no],
    ] as const) {
      await banco.votos.emitir(pregunta.id, participante, opcion);
    }

    const xminsDeConteo = await banco.prisma.$queryRaw<{ xmin: string }[]>`
      SELECT DISTINCT xmin::text AS "xmin" FROM "conteos" WHERE "preguntaId" = ${pregunta.id}`;
    const ultimo = await banco.prisma.$queryRaw<{ xmin: string }[]>`
      SELECT xmin::text AS "xmin" FROM "votos_emitidos"
      WHERE "preguntaId" = ${pregunta.id} AND "participanteId" = 'p4'`;
    expect(xminsDeConteo).toEqual(ultimo);

    // La consulta de unión por xmin no atribuye a nadie una opción de total 1 (2 y 2 votos).
    const union = await banco.prisma.$queryRaw<{ participanteId: string; opcionId: string }[]>`
      SELECT ve."participanteId", c."opcionId" FROM "votos_emitidos" ve
      JOIN "conteos" c ON c.xmin = ve.xmin AND c."preguntaId" = ve."preguntaId"
      WHERE c."total" = 1`;
    expect(union).toEqual([]);
  });

  it("borde: con un solo voto en total, el conteo de uno lo delata (igual que cualquier conteo de uno)", async () => {
    const { pregunta, si } = await preguntaAbierta();
    await banco.votos.emitir(pregunta.id, "p1", si);

    const union = await banco.prisma.$queryRaw<{ participanteId: string; opcionId: string }[]>`
      SELECT ve."participanteId", c."opcionId" FROM "votos_emitidos" ve
      JOIN "conteos" c ON c.xmin = ve.xmin AND c."preguntaId" = ve."preguntaId"
      WHERE c."total" = 1`;
    expect(union).toEqual([{ participanteId: "p1", opcionId: si }]);
  });

  it("300 votos simultáneos de 300 participantes terminan sin errores y suman 300", async () => {
    const { pregunta, si, no } = await preguntaAbierta();
    const inicio = Date.now();

    const resultados = await Promise.allSettled(
      Array.from({ length: 300 }, (_, i) =>
        banco.votos.emitir(pregunta.id, `p${i}`, i % 3 === 0 ? no : si),
      ),
    );

    expect(resultados.filter((r) => r.status === "rejected")).toEqual([]);
    const conteos = await banco.votos.conteos(pregunta.id);
    expect(conteos.get(no)).toBe(100);
    expect(conteos.get(si)).toBe(200);
    expect(await banco.votos.votosEmitidos(pregunta.id)).toBe(300);
    const duracion = Date.now() - inicio;
    expect(duracion).toBeLessThan(10_000);
  }, 20_000);
});
