import type { Decision } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import { filtroPublico, type ConsultaPublica } from "./filtro-publico.js";

/** Público: solo de sesiones con acta final y fuera de la cuenta de prueba. */
export class ListarDecisionesPublicas {
  constructor(
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly cuerpos: RepositorioDeCuerpos,
  ) {}

  async ejecutar(consulta: ConsultaPublica): Promise<Decision[]> {
    return this.decisiones.publicas(await filtroPublico(this.cuerpos, consulta));
  }
}
