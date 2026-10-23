import type { DirectorioDePersonal, PersonaDelPersonal } from "@kuorum/application";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

export class PrismaDirectorioDePersonal implements DirectorioDePersonal {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async listar(): Promise<PersonaDelPersonal[]> {
    const filas = await this.contexto.cliente().user.findMany({
      where: { rol: "MESA" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        membresias: { select: { usuarioId: true, cuerpoId: true, rol: true } },
      },
    });
    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.name,
      correo: fila.email,
      membresias: fila.membresias,
    }));
  }

  async existe(usuarioId: string): Promise<boolean> {
    return (
      (await this.contexto.cliente().user.count({ where: { id: usuarioId, rol: "MESA" } })) > 0
    );
  }
}
