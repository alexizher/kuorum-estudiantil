export type TipoDeMocion = "ORDEN" | "PROCEDIMIENTO" | "ACLARACION" | "SUFICIENTE_ILUSTRACION";

export const PRIORIDAD_DE_MOCION: Record<TipoDeMocion, number> = {
  ORDEN: 1,
  PROCEDIMIENTO: 2,
  ACLARACION: 3,
  SUFICIENTE_ILUSTRACION: 4,
};

export const DESCRIPCION_DE_MOCION: Record<TipoDeMocion, string> = {
  ORDEN: "Pide que se respete el reglamento o el orden del día.",
  PROCEDIMIENTO: "Propone otra forma de llevar la discusión o la votación.",
  ACLARACION: "Pide que se explique un dato o qué se está votando.",
  SUFICIENTE_ILUSTRACION: "Propone cerrar el debate y pasar a votar.",
};

export const NOMBRE_DE_MOCION: Record<TipoDeMocion, string> = {
  ORDEN: "De orden",
  PROCEDIMIENTO: "De procedimiento",
  ACLARACION: "De aclaración",
  SUFICIENTE_ILUSTRACION: "De suficiente ilustración",
};
