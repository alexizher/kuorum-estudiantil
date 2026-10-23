const MODALIDAD: Readonly<Record<string, string>> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  MIXTA: "Mixta",
};

export function etiquetaDeModalidad(modalidad: string): string {
  return MODALIDAD[modalidad] ?? modalidad;
}

function comoFecha(fecha: string): Date {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** "martes, 3 de noviembre". La fecha ya viene en la zona de la institución. */
export function diaLargo(fecha: string): string {
  return comoFecha(fecha).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "3 de noviembre". */
export function diaYMes(fecha: string): string {
  return comoFecha(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "noviembre de 2026". */
export function nombreDelMes(mes: string): string {
  return comoFecha(`${mes}-01`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
