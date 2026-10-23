import { z } from "zod";

const texto = (maximo: number) => z.string().min(1).max(maximo);
const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const url = z.string().url();
const proveedorOAuth = z.enum(["microsoft", "google"]);

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

/** Hora local de la institución, sin desfase: `2026-11-03T14:00`. La convierte el servidor. */
const horaLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const modalidad = z.enum(["PRESENCIAL", "VIRTUAL", "MIXTA"]);
const lugar = z.string().max(200).nullable().optional();

const ordenDelDia = z.array(texto(200)).max(30);

const alMenosUno = (objeto: object) => Object.keys(objeto).length > 0;

export const esquemaCrearSesion = z.object({
  titulo: texto(300),
  modo: z.enum(["SALA_ABIERTA", "CON_CODIGOS"]),
  segundosPorIntervencion: z.number().int().min(30).max(900).optional(),
  cuerpoId: texto(100),
  inicio: horaLocal,
  fin: horaLocal,
  modalidad,
  lugar,
  ordenDelDia: ordenDelDia.optional(),
});

export const esquemaReprogramar = z
  .object({
    titulo: texto(300).optional(),
    inicio: horaLocal.optional(),
    fin: horaLocal.optional(),
    modalidad: modalidad.optional(),
    lugar,
    ordenDelDia: ordenDelDia.optional(),
  })
  .refine(alMenosUno);

export const esquemaInstitucion = z
  .object({
    nombre: texto(120).optional(),
    tipoDeCuerpoSingular: texto(40).optional(),
    tipoDeCuerpoPlural: texto(40).optional(),
    zonaHoraria: texto(80).optional(),
    logoUrl: url.nullable().optional(),
    colorPrimario: colorHex.nullable().optional(),
    colorSecundario: colorHex.nullable().optional(),
    pieDePagina: z.string().max(500).nullable().optional(),
    textoBienvenida: z.string().max(1000).nullable().optional(),
    proveedorOAuth: proveedorOAuth.nullable().optional(),
    clientIdOAuth: z.string().max(200).nullable().optional(),
    clientSecretOAuth: z.string().max(500).nullable().optional(),
  })
  .refine(alMenosUno);

export const esquemaCuerpo = z.object({ nombre: texto(120) });

export const esquemaCambioDeCuerpo = z.union([
  z.object({ nombre: texto(120) }),
  z.object({ archivado: z.literal(true) }),
]);

export const esquemaPersona = z.object({ correo: z.email().max(200), nombre: texto(120) });

export const esquemaMembresia = z.object({
  cuerpoId: texto(100),
  rol: z.enum(["ENCARGADO", "MESA"]),
});

export const esquemaGenerarCodigos = z.object({ cantidad: z.number().int().min(1).max(2000) });

export const esquemaCrearPregunta = z.object({
  texto: texto(1000),
  opciones: z.array(texto(200)).max(20).optional(),
});

export const esquemaDarLaPalabra = z.object({ solicitudId: texto(100).optional() });

export const esquemaEnunciado = z.object({ enunciado: z.string().max(1000).nullable() });

export const esquemaActa = z.object({ desarrollo: z.string().max(20_000) });
