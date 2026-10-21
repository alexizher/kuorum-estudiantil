import type { LimpiezaDeDemo } from "@kuorum/application";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

export class PrismaLimpiezaDeDemo implements LimpiezaDeDemo {
  constructor(private readonly contexto: ContextoTransaccional) {}

  /**
   * Una sola sentencia DELETE sobre sesiones. Preguntas, opciones, conteos, votos emitidos,
   * códigos, participantes y solicitudes caen por ON DELETE CASCADE, así que no puede quedar
   * una fila suelta de una sesión borrada.
   */
  async eliminarSesionesDeLaCuentaDePrueba(): Promise<number> {
    const { count } = await this.contexto
      .cliente()
      .sesion.deleteMany({ where: { creadaPor: { rol: "DEMO" } } });
    return count;
  }
}
