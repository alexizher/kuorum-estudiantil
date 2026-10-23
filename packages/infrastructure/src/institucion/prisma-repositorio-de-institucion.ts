import { Institucion } from "@kuorum/domain";
import type { RepositorioDeInstitucion } from "@kuorum/application";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

const ID = "institucion";

export class PrismaRepositorioDeInstitucion implements RepositorioDeInstitucion {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async obtener(): Promise<Institucion> {
    const fila = await this.contexto.cliente().institucion.findUniqueOrThrow({ where: { id: ID } });
    return Institucion.reconstruir(fila);
  }

  async guardar(institucion: Institucion): Promise<void> {
    await this.contexto.cliente().institucion.update({
      where: { id: ID },
      data: {
        nombre: institucion.nombre,
        tipoDeCuerpoSingular: institucion.tipoDeCuerpoSingular,
        tipoDeCuerpoPlural: institucion.tipoDeCuerpoPlural,
        zonaHoraria: institucion.zonaHoraria,
      },
    });
  }
}
