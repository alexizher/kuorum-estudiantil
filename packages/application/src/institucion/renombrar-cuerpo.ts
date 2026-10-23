import { Cuerpo } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { Actor } from "../sala/actor.js";
import { exigirSlugLibre, obtenerCuerpo } from "./obtener-cuerpo.js";
import { exigirAdministrador } from "./permisos.js";

export class RenombrarCuerpo {
  constructor(private readonly cuerpos: RepositorioDeCuerpos) {}

  async ejecutar(actor: Actor, cuerpoId: string, nombre: string): Promise<void> {
    exigirAdministrador(actor);
    const cuerpo = await obtenerCuerpo(this.cuerpos, cuerpoId);
    // Se comprueba con un cuerpo de prueba para no tocar el real si el nombre está ocupado.
    const candidato = Cuerpo.nuevo({ id: cuerpo.id, nombre, tipo: cuerpo.tipo });
    await exigirSlugLibre(this.cuerpos, candidato.slug, cuerpo.id);
    cuerpo.renombrar(nombre);
    await this.cuerpos.guardar(cuerpo);
  }
}
