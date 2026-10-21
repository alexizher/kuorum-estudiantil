import { z } from "zod";

const tipoDeMocion = z.enum(["ORDEN", "PROCEDIMIENTO", "ACLARACION", "SUFICIENTE_ILUSTRACION"]);
const tipoDeSolicitud = z.enum(["INTERVENCION", "MOCION"]);

const resultado = z.object({
  totalVotos: z.number().int().nonnegative(),
  porOpcion: z.array(
    z.object({
      opcionId: z.string(),
      texto: z.string(),
      votos: z.number().int().nonnegative(),
      porcentaje: z.number().min(0).max(100),
    }),
  ),
  ganadora: z.string().nullable(),
  aprobada: z.boolean().nullable(),
});

const pregunta = z.object({
  id: z.string(),
  texto: z.string(),
  estado: z.enum(["BORRADOR", "ABIERTA", "CERRADA", "ANULADA"]),
  secreta: z.literal(true),
  opciones: z.array(z.object({ id: z.string(), texto: z.string() })),
  votosEmitidos: z.number().int().nonnegative(),
  resultado: resultado.nullable(),
});

const solicitudEnFila = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: tipoDeSolicitud,
  mocion: tipoDeMocion.nullable(),
});

export const esquemaEstadoDeSala = z.object({
  sala: z.object({
    codigo: z.string(),
    titulo: z.string(),
    estado: z.enum(["PROGRAMADA", "ABIERTA", "EN_CURSO", "CERRADA", "ACTA_FINAL", "CANCELADA"]),
    modo: z.enum(["SALA_ABIERTA", "CON_CODIGOS"]),
    indicativa: z.boolean(),
  }),
  version: z.number().int().nonnegative(),
  asistencia: z.number().int().nonnegative().nullable(),
  pregunta: pregunta.nullable(),
  palabra: z.object({
    conLaPalabra: solicitudEnFila
      .extend({
        inicioEn: z.iso.datetime(),
        segundosTotales: z.number().int().nonnegative(),
      })
      .nullable(),
    fila: z.array(solicitudEnFila),
  }),
  horaDelServidor: z.iso.datetime(),
});

export type EstadoDeSala = z.infer<typeof esquemaEstadoDeSala>;
