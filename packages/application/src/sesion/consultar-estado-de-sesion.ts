import {
  SesionNoEncontrada,
  type InstantaneaDeSesion,
  type RepositorioDeInstantaneas,
} from "@kuorum/domain";

export class ConsultarEstadoDeSesion {
  constructor(private readonly repositorio: RepositorioDeInstantaneas) {}

  async ejecutar(sesionId: string): Promise<InstantaneaDeSesion> {
    const instantanea = await this.repositorio.obtener(sesionId);
    if (instantanea === null) {
      throw new SesionNoEncontrada(sesionId);
    }
    return instantanea;
  }
}
