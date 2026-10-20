import { CodigoDeSala, Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "@kuorum/application";
import type { Sesion as FilaDeSesion } from "../generated/prisma/client.js";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

function aDominio(fila: FilaDeSesion): Sesion {
  return Sesion.reconstruir({
    id: fila.id,
    titulo: fila.titulo,
    codigoDeSala: CodigoDeSala.crear(fila.codigoDeSala),
    modo: fila.modo,
    estado: fila.estado,
    segundosPorIntervencion: fila.segundosPorIntervencion,
    version: fila.version,
    creadaEn: fila.creadaEn,
  });
}

export class PrismaRepositorioDeSesiones implements RepositorioDeSesiones {
  // Versión con la que se leyó (o guardó) cada instancia. Sirve para sumar solo lo que
  // esa instancia cambió: dos acciones simultáneas que parten de la versión 5 dejan 7,
  // no 6, y el ETag del estado público no se repite con contenido distinto.
  private readonly versionLeida = new WeakMap<Sesion, number>();

  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<Sesion | null> {
    const fila = await this.contexto.cliente().sesion.findUnique({ where: { id } });
    return fila === null ? null : this.recordar(aDominio(fila));
  }

  async porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null> {
    const fila = await this.contexto
      .cliente()
      .sesion.findUnique({ where: { codigoDeSala: codigo.valor } });
    return fila === null ? null : this.recordar(aDominio(fila));
  }

  async listar(): Promise<Sesion[]> {
    const filas = await this.contexto.cliente().sesion.findMany({ orderBy: { creadaEn: "asc" } });
    return filas.map((fila) => this.recordar(aDominio(fila)));
  }

  async guardar(sesion: Sesion): Promise<void> {
    const cliente = this.contexto.cliente();
    const leida = this.versionLeida.get(sesion);
    const datos = {
      titulo: sesion.titulo,
      modo: sesion.modo,
      estado: sesion.estado,
      segundosPorIntervencion: sesion.segundosPorIntervencion,
    };
    if (leida === undefined) {
      await cliente.sesion.upsert({
        where: { id: sesion.id },
        create: {
          id: sesion.id,
          codigoDeSala: sesion.codigoDeSala.valor,
          version: sesion.version,
          creadaEn: sesion.creadaEn,
          ...datos,
        },
        update: { ...datos, version: { increment: 0 } },
      });
    } else {
      await cliente.sesion.update({
        where: { id: sesion.id },
        data: { ...datos, version: { increment: sesion.version - leida } },
      });
    }
    this.versionLeida.set(sesion, sesion.version);
  }

  private recordar(sesion: Sesion): Sesion {
    this.versionLeida.set(sesion, sesion.version);
    return sesion;
  }
}
