import type { Actor } from "../../src/index.js";

export const CUERPO_GENERAL = "c-general";
export const CUERPO_INGENIERIA = "c-ingenieria";
export const CUERPO_MEDICINA = "c-medicina";
export const CUERPO_ARCHIVADO = "c-archivado";

export const superadmin: Actor = { id: "u-superadmin", rol: "SUPERADMIN", membresias: [] };
/** Personal con la general a cargo: el caso de las cuentas MESA que ya existían. */
export const mesa: Actor = {
  id: "u-mesa",
  rol: "MESA",
  membresias: [{ cuerpoId: CUERPO_GENERAL, rol: "ENCARGADO" }],
};
export const encargadoDeLaGeneral = mesa;
export const demo: Actor = { id: "u-demo", rol: "DEMO", membresias: [] };
export const otraDemo: Actor = { id: "u-otra-demo", rol: "DEMO", membresias: [] };
export const encargadoDeIngenieria: Actor = {
  id: "u-enc-ing",
  rol: "MESA",
  membresias: [{ cuerpoId: CUERPO_INGENIERIA, rol: "ENCARGADO" }],
};
export const mesaDeIngenieria: Actor = {
  id: "u-mesa-ing",
  rol: "MESA",
  membresias: [{ cuerpoId: CUERPO_INGENIERIA, rol: "MESA" }],
};
export const encargadoDeMedicina: Actor = {
  id: "u-enc-med",
  rol: "MESA",
  membresias: [{ cuerpoId: CUERPO_MEDICINA, rol: "ENCARGADO" }],
};
export const encargadoDeArchivado: Actor = {
  id: "u-enc-arch",
  rol: "MESA",
  membresias: [{ cuerpoId: CUERPO_ARCHIVADO, rol: "ENCARGADO" }],
};
export const sinMembresias: Actor = { id: "u-sin", rol: "MESA", membresias: [] };

export const CUENTAS_DE_DEMO: readonly string[] = [demo.id, otraDemo.id];
