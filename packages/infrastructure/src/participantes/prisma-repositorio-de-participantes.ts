import { ErrorDeDominio } from "@kuorum/domain";
import type {
  Participante,
  RepositorioDeParticipantes,
  ResultadoDeActivacion,
} from "@kuorum/application";
import type { Participante as FilaDeParticipante } from "../generated/prisma/client.js";
import {
  esViolacionDeUnico,
  type ContextoTransaccional,
} from "../prisma/contexto-transaccional.js";

function aAplicacion(fila: FilaDeParticipante): Participante {
  return {
    id: fila.id,
    sesionId: fila.sesionId,
    credencial: fila.credencial,
    hash: fila.hash,
    creadoEn: fila.creadoEn,
  };
}

export class PrismaRepositorioDeParticipantes implements RepositorioDeParticipantes {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<Participante | null> {
    const fila = await this.contexto.cliente().participante.findUnique({ where: { id } });
    return fila === null ? null : aAplicacion(fila);
  }

  async porCredencial(sesionId: string, hash: string): Promise<Participante | null> {
    const fila = await this.contexto
      .cliente()
      .participante.findUnique({ where: { sesionId_hash: { sesionId, hash } } });
    return fila === null ? null : aAplicacion(fila);
  }

  /**
   * INSERT ... ON CONFLICT DO NOTHING: una violación de único dentro de una transacción la
   * deja abortada, y el ingreso tiene que poder seguir. Si otra entrada ganó la carrera,
   * se devuelve su participante.
   */
  async crear(participante: Participante): Promise<Participante> {
    const cliente = this.contexto.cliente();
    await cliente.participante.createMany({
      data: [
        {
          id: participante.id,
          sesionId: participante.sesionId,
          credencial: participante.credencial,
          hash: participante.hash,
          creadoEn: participante.creadoEn,
        },
      ],
      skipDuplicates: true,
    });
    const fila = await cliente.participante.findUniqueOrThrow({
      where: { sesionId_hash: { sesionId: participante.sesionId, hash: participante.hash } },
    });
    return aAplicacion(fila);
  }

  async guardarCodigos(sesionId: string, hashes: string[]): Promise<void> {
    try {
      await this.contexto.cliente().codigoDeAcceso.createMany({
        data: hashes.map((hash) => ({ sesionId, hash })),
      });
    } catch (error) {
      if (esViolacionDeUnico(error)) throw new ErrorDeDominio("CODIGO_DUPLICADO");
      throw error;
    }
  }

  /** UPDATE ... WHERE activadoEn IS NULL: de varias activaciones simultáneas gana una. */
  async activarCodigo(sesionId: string, hash: string): Promise<ResultadoDeActivacion> {
    const cliente = this.contexto.cliente();
    const { count } = await cliente.codigoDeAcceso.updateMany({
      where: { sesionId, hash, activadoEn: null },
      data: { activadoEn: new Date() },
    });
    if (count === 1) return "ACTIVADO";
    const existe = await cliente.codigoDeAcceso.count({ where: { sesionId, hash } });
    return existe > 0 ? "YA_ACTIVO" : "NO_EXISTE";
  }

  /** Códigos activados, no filas de participantes. */
  contarActivos(sesionId: string): Promise<number> {
    return this.contexto
      .cliente()
      .codigoDeAcceso.count({ where: { sesionId, activadoEn: { not: null } } });
  }

  contarCodigos(sesionId: string): Promise<number> {
    return this.contexto.cliente().codigoDeAcceso.count({ where: { sesionId } });
  }
}
