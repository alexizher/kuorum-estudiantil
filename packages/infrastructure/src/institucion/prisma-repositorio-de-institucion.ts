import { Institucion, type ProveedorOAuth } from "@kuorum/domain";
import type { RepositorioDeInstitucion } from "@kuorum/application";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

const ID = "institucion";

export class PrismaRepositorioDeInstitucion implements RepositorioDeInstitucion {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async obtener(): Promise<Institucion> {
    const fila = await this.contexto.cliente().institucion.findUniqueOrThrow({ where: { id: ID } });
    return Institucion.reconstruir({
      nombre: fila.nombre,
      tipoDeCuerpoSingular: fila.tipoDeCuerpoSingular,
      tipoDeCuerpoPlural: fila.tipoDeCuerpoPlural,
      zonaHoraria: fila.zonaHoraria,
      logoUrl: fila.logoUrl,
      colorPrimario: fila.colorPrimario,
      colorSecundario: fila.colorSecundario,
      pieDePagina: fila.pieDePagina,
      textoBienvenida: fila.textoBienvenida,
      proveedorOAuth: fila.proveedorOAuth as ProveedorOAuth,
      clientIdOAuth: fila.clientIdOAuth,
      clientSecretOAuth: fila.clientSecretOAuth,
    });
  }

  async guardar(institucion: Institucion): Promise<void> {
    await this.contexto.cliente().institucion.update({
      where: { id: ID },
      data: {
        nombre: institucion.nombre,
        tipoDeCuerpoSingular: institucion.tipoDeCuerpoSingular,
        tipoDeCuerpoPlural: institucion.tipoDeCuerpoPlural,
        zonaHoraria: institucion.zonaHoraria,
        logoUrl: institucion.logoUrl,
        colorPrimario: institucion.colorPrimario,
        colorSecundario: institucion.colorSecundario,
        pieDePagina: institucion.pieDePagina,
        textoBienvenida: institucion.textoBienvenida,
        proveedorOAuth: institucion.proveedorOAuth,
        clientIdOAuth: institucion.clientIdOAuth,
        clientSecretOAuth: institucion.clientSecretOAuth,
      },
    });
  }
}
