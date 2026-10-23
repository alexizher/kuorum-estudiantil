import { Acta, CodigoDeVerificacion, CodigoDeSala, ErrorDeDominio, Sesion } from "@kuorum/domain";
import type { ContenidoDeActa } from "@kuorum/domain";
import type { FiltroPublico, RepositorioDeActas } from "@kuorum/application";
import type {
  Prisma,
  Acta as FilaDeActa,
  Sesion as FilaDeSesion,
} from "../generated/prisma/client.js";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

function aDominio(fila: FilaDeActa): Acta {
  if (fila.estado === "FINAL" && (fila.codigo === null || fila.contenido === null)) {
    throw new ErrorDeDominio("ACTA_INCONSISTENTE", "Un acta final sin código o sin contenido");
  }
  return Acta.reconstruir({
    sesionId: fila.sesionId,
    desarrollo: fila.desarrollo,
    estado: fila.estado,
    codigo: fila.codigo === null ? null : CodigoDeVerificacion.crear(fila.codigo),
    finalizadaEn: fila.finalizadaEn,
    contenido: fila.contenido as unknown as ContenidoDeActa | null,
  });
}

function sesionADominio(fila: FilaDeSesion & { creadaPor: { rol: string } | null }): Sesion {
  return Sesion.reconstruir({
    id: fila.id,
    titulo: fila.titulo,
    codigoDeSala: CodigoDeSala.crear(fila.codigoDeSala),
    modo: fila.modo,
    estado: fila.estado,
    segundosPorIntervencion: fila.segundosPorIntervencion,
    version: fila.version,
    creadaEn: fila.creadaEn,
    creadaPorId: fila.creadaPorId,
    creadaPorDemo: fila.creadaPor?.rol === "DEMO",
    cuerpoId: fila.cuerpoId,
    inicio: fila.inicio,
    fin: fila.fin,
    modalidad: fila.modalidad,
    lugar: fila.lugar,
    ordenDelDia: fila.ordenDelDia,
  });
}

export class PrismaRepositorioDeActas implements RepositorioDeActas {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async deSesion(sesionId: string): Promise<Acta | null> {
    const fila = await this.contexto.cliente().acta.findUnique({ where: { sesionId } });
    return fila === null ? null : aDominio(fila);
  }

  async porCodigo(codigo: CodigoDeVerificacion): Promise<Acta | null> {
    const fila = await this.contexto.cliente().acta.findUnique({ where: { codigo: codigo.valor } });
    return fila === null ? null : aDominio(fila);
  }

  async guardar(acta: Acta): Promise<void> {
    const datos = {
      desarrollo: acta.desarrollo,
      estado: acta.estado,
      codigo: acta.codigo?.valor ?? null,
      finalizadaEn: acta.finalizadaEn,
      ...(acta.contenido === null
        ? {}
        : { contenido: acta.contenido as unknown as Prisma.InputJsonValue }),
    };
    await this.contexto.cliente().acta.upsert({
      where: { sesionId: acta.sesionId },
      create: { sesionId: acta.sesionId, ...datos },
      update: datos,
    });
  }

  async publicas(filtro: FiltroPublico): Promise<{ acta: Acta; sesion: Sesion }[]> {
    const filas = await this.contexto.cliente().acta.findMany({
      where: {
        estado: "FINAL",
        finalizadaEn: { gte: filtro.desde, lt: filtro.hasta },
        sesion: {
          ...(filtro.cuerpoId === undefined ? {} : { cuerpoId: filtro.cuerpoId }),
          OR: [{ creadaPorId: null }, { creadaPor: { rol: { not: "DEMO" } } }],
        },
      },
      include: { sesion: { include: { creadaPor: { select: { rol: true } } } } },
      orderBy: [{ finalizadaEn: "asc" }, { sesionId: "asc" }],
    });
    return filas.map((fila) => ({ acta: aDominio(fila), sesion: sesionADominio(fila.sesion) }));
  }
}
