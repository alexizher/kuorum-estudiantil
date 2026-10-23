import { CodigoDeSala, ErrorDeDominio, Sesion } from "@kuorum/domain";
import type { FiltroDeRango, FiltroDeSesiones, RepositorioDeSesiones } from "@kuorum/application";
import type { Prisma, Sesion as FilaDeSesion } from "../generated/prisma/client.js";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

// Con el rol del creador se sabe si es de la cuenta de prueba sin otra consulta.
const CON_CREADOR = { creadaPor: { select: { rol: true } } } as const;

type FilaConCreador = FilaDeSesion & { creadaPor: { rol: string } | null };

const SIN_CUENTA_DE_PRUEBA: Prisma.SesionWhereInput = {
  OR: [{ creadaPorId: null }, { creadaPor: { rol: { not: "DEMO" as const } } }],
};

function aDominio(fila: FilaConCreador): Sesion {
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
  });
}

export class PrismaRepositorioDeSesiones implements RepositorioDeSesiones {
  // Versión con la que se leyó (o guardó) cada instancia. Sirve para sumar solo lo que
  // esa instancia cambió: dos acciones simultáneas que parten de la versión 5 dejan 7,
  // no 6, y el ETag del estado público no se repite con contenido distinto.
  private readonly versionLeida = new WeakMap<Sesion, number>();

  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<Sesion | null> {
    const fila = await this.contexto
      .cliente()
      .sesion.findUnique({ where: { id }, include: CON_CREADOR });
    return fila === null ? null : this.recordar(aDominio(fila));
  }

  async porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null> {
    const fila = await this.contexto
      .cliente()
      .sesion.findUnique({ where: { codigoDeSala: codigo.valor }, include: CON_CREADOR });
    return fila === null ? null : this.recordar(aDominio(fila));
  }

  async listar(filtro: FiltroDeSesiones = {}): Promise<Sesion[]> {
    const filas = await this.contexto.cliente().sesion.findMany({
      where: {
        ...(filtro.creadaPorId === undefined ? {} : { creadaPorId: filtro.creadaPorId }),
        ...(filtro.cuerpoIds === undefined ? {} : { cuerpoId: { in: [...filtro.cuerpoIds] } }),
        ...(filtro.sinCuentaDePrueba === true ? SIN_CUENTA_DE_PRUEBA : {}),
      },
      include: CON_CREADOR,
      orderBy: { creadaEn: "asc" },
    });
    return filas.map((fila) => this.recordar(aDominio(fila)));
  }

  async enRango(desde: Date, hasta: Date, filtro: FiltroDeRango = {}): Promise<Sesion[]> {
    const filas = await this.contexto.cliente().sesion.findMany({
      where: {
        inicio: { lt: hasta },
        fin: { gt: desde },
        ...(filtro.cuerpoId === undefined ? {} : { cuerpoId: filtro.cuerpoId }),
        ...(filtro.sinCanceladas === true ? { estado: { not: "CANCELADA" as const } } : {}),
        AND: [
          filtro.incluirDe === undefined
            ? SIN_CUENTA_DE_PRUEBA
            : { OR: [SIN_CUENTA_DE_PRUEBA, { creadaPorId: filtro.incluirDe }] },
        ],
      },
      include: CON_CREADOR,
      orderBy: [{ inicio: "asc" }, { id: "asc" }],
    });
    return filas.map((fila) => this.recordar(aDominio(fila)));
  }

  contarDe(creadaPorId: string): Promise<number> {
    return this.contexto.cliente().sesion.count({ where: { creadaPorId } });
  }

  contarActivasDe(creadaPorId: string): Promise<number> {
    return this.contexto.cliente().sesion.count({
      where: { creadaPorId, estado: { notIn: ["CERRADA", "ACTA_FINAL", "CANCELADA"] } },
    });
  }

  async guardar(sesion: Sesion): Promise<void> {
    const cliente = this.contexto.cliente();
    const leida = this.versionLeida.get(sesion);
    const datos = {
      titulo: sesion.titulo,
      modo: sesion.modo,
      estado: sesion.estado,
      segundosPorIntervencion: sesion.segundosPorIntervencion,
      inicio: sesion.inicio,
      fin: sesion.fin,
      modalidad: sesion.modalidad,
      lugar: sesion.lugar,
    };
    if (leida === undefined) {
      await this.crear(sesion, datos);
    } else {
      await cliente.sesion.update({
        where: { id: sesion.id },
        data: { ...datos, version: { increment: sesion.version - leida } },
      });
    }
    this.versionLeida.set(sesion, sesion.version);
  }

  // Una instancia nunca leída por el repositorio solo puede ser nueva: si la fila ya existe
  // no se sabe cuánto sumar a la versión, y descartarla en silencio rompería el ETag.
  private async crear(sesion: Sesion, datos: object): Promise<void> {
    // Se comprueba antes de crear: capturar la violación de único dejaría abortada la
    // transacción de una unidad de trabajo externa.
    if (await this.existe(sesion.id)) {
      throw new ErrorDeDominio("SESION_NO_CARGADA", "La sesión existe y no se cargó con porId");
    }
    await this.contexto.cliente().sesion.create({
      data: {
        id: sesion.id,
        codigoDeSala: sesion.codigoDeSala.valor,
        version: sesion.version,
        creadaEn: sesion.creadaEn,
        creadaPorId: sesion.creadaPorId,
        cuerpoId: sesion.cuerpoId,
        ...datos,
      } as Prisma.SesionUncheckedCreateInput,
    });
  }

  private async existe(id: string): Promise<boolean> {
    return (await this.contexto.cliente().sesion.count({ where: { id } })) > 0;
  }

  private recordar(sesion: Sesion): Sesion {
    this.versionLeida.set(sesion, sesion.version);
    return sesion;
  }
}
