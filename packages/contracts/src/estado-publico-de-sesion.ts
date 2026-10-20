import { z } from "zod";

export const esquemaEstadoPublicoDeSesion = z.object({
  sesionId: z.string(),
  estado: z.enum(["PROGRAMADA", "ABIERTA", "EN_CURSO", "CERRADA", "ACTA_FINAL", "CANCELADA"]),
  version: z.number().int().nonnegative(),
  actualizadaEn: z.iso.datetime(),
});

export type EstadoPublicoDeSesion = z.infer<typeof esquemaEstadoPublicoDeSesion>;
