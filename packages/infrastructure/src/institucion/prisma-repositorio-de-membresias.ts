import type { Membresia, RepositorioDeMembresias } from "@kuorum/application";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

export class PrismaRepositorioDeMembresias implements RepositorioDeMembresias {
  constructor(private readonly contexto: ContextoTransaccional) {}

  deUsuario(usuarioId: string): Promise<Membresia[]> {
    return this.contexto.cliente().membresia.findMany({
      where: { usuarioId },
      select: { usuarioId: true, cuerpoId: true, rol: true },
    });
  }

  async asignar({ usuarioId, cuerpoId, rol }: Membresia): Promise<void> {
    await this.contexto.cliente().membresia.upsert({
      where: { usuarioId_cuerpoId: { usuarioId, cuerpoId } },
      create: { usuarioId, cuerpoId, rol },
      update: { rol },
    });
  }

  async quitar(usuarioId: string, cuerpoId: string): Promise<void> {
    await this.contexto.cliente().membresia.deleteMany({ where: { usuarioId, cuerpoId } });
  }
}
