import { ErrorDeDominio, type GeneradorDeCodigos } from "@kuorum/domain";
import type { Hasheador } from "../puertos/hasheador.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "./actor.js";
import {
  CODIGOS_MAXIMOS_POR_SESION_DE_DEMO,
  CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO,
} from "./limites-de-demo.js";
import { obtenerSesionDeLaMesa } from "./obtener-sesion-de-la-mesa.js";

const CANTIDAD_MIN = 1;
const CANTIDAD_MAX = 2000;
const INTENTOS_POR_CODIGO = 5;

export class GenerarCodigosDeAcceso {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly participantes: RepositorioDeParticipantes,
    private readonly unidad: UnidadDeTrabajo,
    private readonly generador: GeneradorDeCodigos,
    private readonly hasheador: Hasheador,
  ) {}

  /** Devuelve el texto plano una sola vez; solo se guardan los hashes. */
  async ejecutar(actor: Actor, sesionId: string, cantidad: number): Promise<string[]> {
    if (!Number.isInteger(cantidad) || cantidad < CANTIDAD_MIN || cantidad > CANTIDAD_MAX) {
      throw new ErrorDeDominio("CANTIDAD_INVALIDA");
    }
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
      if (sesion.modo !== "CON_CODIGOS") throw new ErrorDeDominio("MODO_SIN_CODIGOS");
      if (actor.rol === "DEMO") await this.exigirDentroDelLimiteDeDemo(sesion.id, cantidad);

      const codigos = new Set<string>();
      let intentos = 0;
      while (codigos.size < cantidad) {
        if (intentos >= cantidad * INTENTOS_POR_CODIGO) {
          throw new ErrorDeDominio("SIN_CODIGOS_DE_ACCESO_LIBRES");
        }
        intentos += 1;
        codigos.add(this.generador.codigoDeAcceso().valor);
      }
      const lista = [...codigos];
      await this.participantes.guardarCodigos(
        sesion.id,
        lista.map((codigo) => this.hasheador.sha256(codigo)),
      );
      return lista;
    });
  }

  private async exigirDentroDelLimiteDeDemo(sesionId: string, cantidad: number): Promise<void> {
    const yaGenerados = await this.participantes.contarCodigos(sesionId);
    if (
      cantidad > CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO ||
      yaGenerados + cantidad > CODIGOS_MAXIMOS_POR_SESION_DE_DEMO
    ) {
      throw new ErrorDeDominio("LIMITE_DE_CODIGOS_DE_DEMO");
    }
  }
}
