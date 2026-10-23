import { Cuerpo } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "@kuorum/application";
import type { Cuerpo as FilaDeCuerpo } from "../generated/prisma/client.js";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

function aDominio(fila: FilaDeCuerpo): Cuerpo {
  return Cuerpo.reconstruir(fila);
}

export class PrismaRepositorioDeCuerpos implements RepositorioDeCuerpos {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<Cuerpo | null> {
    const fila = await this.contexto.cliente().cuerpo.findUnique({ where: { id } });
    return fila === null ? null : aDominio(fila);
  }

  async porSlug(slug: string): Promise<Cuerpo | null> {
    const fila = await this.contexto.cliente().cuerpo.findUnique({ where: { slug } });
    return fila === null ? null : aDominio(fila);
  }

  async listar(): Promise<Cuerpo[]> {
    // GENERAL va antes que FACULTAD en el enum.
    const filas = await this.contexto
      .cliente()
      .cuerpo.findMany({ orderBy: [{ tipo: "asc" }, { nombre: "asc" }] });
    return filas.map(aDominio);
  }

  async guardar(cuerpo: Cuerpo): Promise<void> {
    const datos = { nombre: cuerpo.nombre, slug: cuerpo.slug, archivado: cuerpo.archivado };
    await this.contexto.cliente().cuerpo.upsert({
      where: { id: cuerpo.id },
      create: { id: cuerpo.id, tipo: cuerpo.tipo, ...datos },
      update: datos,
    });
  }
}
