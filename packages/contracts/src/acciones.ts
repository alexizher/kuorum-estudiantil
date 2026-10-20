import { z } from "zod";

const texto = (maximo: number) => z.string().min(1).max(maximo);

export const esquemaIngresar = z
  .object({
    codigo: texto(40).optional(),
    tokenNavegador: texto(100).optional(),
  })
  .refine((c) => c.codigo !== undefined || c.tokenNavegador !== undefined);

export const esquemaVoto = z.object({ preguntaId: texto(100), opcionId: texto(100) });

export const esquemaPedirPalabra = z.object({ nombreVisible: texto(200) });

export const esquemaMocion = z.object({
  nombreVisible: texto(200),
  tipo: z.enum(["ORDEN", "PROCEDIMIENTO", "ACLARACION", "SUFICIENTE_ILUSTRACION"]),
});

export const esquemaCrearSesion = z.object({
  titulo: texto(300),
  modo: z.enum(["SALA_ABIERTA", "CON_CODIGOS"]),
  segundosPorIntervencion: z.number().int().optional(),
});

export const esquemaGenerarCodigos = z.object({ cantidad: z.number().int() });

export const esquemaCrearPregunta = z.object({
  texto: texto(1000),
  opciones: z.array(texto(200)).max(20).optional(),
});

export const esquemaDarLaPalabra = z.object({ solicitudId: texto(100).optional() });
