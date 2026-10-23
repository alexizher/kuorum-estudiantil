import { ErrorDeDominio, type ContenidoDeActa, type Sesion } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import { armarContenidoDeActa } from "./armar-contenido.js";

/** Junta lo que necesita `armarContenidoDeActa`: lo usan la vista previa y el cierre. */
export class ArmadorDeActa {
  constructor(
    private readonly cuerpos: RepositorioDeCuerpos,
    private readonly institucion: RepositorioDeInstitucion,
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly participantes: RepositorioDeParticipantes,
  ) {}

  async armar(sesion: Sesion, desarrollo: string): Promise<ContenidoDeActa> {
    const cuerpo = await this.cuerpos.porId(sesion.cuerpoId);
    if (cuerpo === null) throw new ErrorDeDominio("CUERPO_NO_EXISTE");
    // Una votación anulada después de cerrarla no cuenta como decisión del acta.
    const anuladas = new Set(
      (await this.preguntas.deSesion(sesion.id))
        .filter((p) => p.estado === "ANULADA")
        .map((p) => p.id),
    );
    const decisiones = (await this.decisiones.deSesion(sesion.id)).filter(
      (d) => !anuladas.has(d.preguntaId),
    );
    const asistentes =
      sesion.modo === "CON_CODIGOS" ? await this.participantes.contarActivos(sesion.id) : null;
    return armarContenidoDeActa(
      sesion,
      cuerpo,
      await this.institucion.obtener(),
      decisiones,
      await this.solicitudes.deSesion(sesion.id),
      asistentes,
      desarrollo,
    );
  }
}
