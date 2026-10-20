export type TipoDeMocion = "ORDEN" | "PROCEDIMIENTO" | "ACLARACION" | "SUFICIENTE_ILUSTRACION";

export const PRIORIDAD_DE_MOCION: Record<TipoDeMocion, number> = {
  ORDEN: 1,
  PROCEDIMIENTO: 2,
  ACLARACION: 3,
  SUFICIENTE_ILUSTRACION: 4,
};

export const DESCRIPCION_DE_MOCION: Record<TipoDeMocion, string> = {
  ORDEN: "Se está incumpliendo el reglamento o el orden de la sesión.",
  PROCEDIMIENTO: "Propones cambiar la forma en que se conduce la sesión.",
  ACLARACION: "Necesitas que se aclare algo que se dijo o se está votando.",
  SUFICIENTE_ILUSTRACION: "Propones cerrar el debate y pasar a votar.",
};
