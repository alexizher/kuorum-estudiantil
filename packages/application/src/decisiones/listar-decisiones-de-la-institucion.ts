import type {
  DecisionesPorCuerpo,
  RepositorioDeDecisiones,
} from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import { filtroPublico, type ConsultaPublica } from "./filtro-publico.js";

/** Público: decisiones de sesiones con acta final, agrupadas por cuerpo, excluyendo DEMO. */
export class ListarDecisionesDeLaInstitucion {
  constructor(
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly cuerpos: RepositorioDeCuerpos,
  ) {}

  async ejecutar(consulta: ConsultaPublica): Promise<DecisionesPorCuerpo[]> {
    return this.decisiones.publicasPorCuerpo(await filtroPublico(this.cuerpos, consulta));
  }
}
