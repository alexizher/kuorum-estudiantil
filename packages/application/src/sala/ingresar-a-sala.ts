import {
  CodigoDeAcceso,
  CodigoDeSala,
  ErrorDeDominio,
  type EstadoDeSesion,
  type GeneradorDeIds,
  type Reloj,
} from "@kuorum/domain";
import type { Hasheador } from "../puertos/hasheador.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Participante } from "./participante.js";

export type CredencialDeIngreso =
  { tipo: "CODIGO"; codigo: string } | { tipo: "NAVEGADOR"; token: string };

export interface ResultadoDeIngreso {
  participanteId: string;
  sesionId: string;
}

const ESTADOS_CON_INGRESO: readonly EstadoDeSesion[] = ["PROGRAMADA", "ABIERTA", "EN_CURSO"];
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class IngresarASala {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly participantes: RepositorioDeParticipantes,
    private readonly unidad: UnidadDeTrabajo,
    private readonly hasheador: Hasheador,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(
    codigoDeSala: string,
    credencial: CredencialDeIngreso,
  ): Promise<ResultadoDeIngreso> {
    const codigo = CodigoDeSala.crear(codigoDeSala);
    return this.unidad.ejecutar(async () => {
      const sesion = await this.sesiones.porCodigoDeSala(codigo);
      if (sesion === null || !ESTADOS_CON_INGRESO.includes(sesion.estado)) {
        throw new ErrorDeDominio("SALA_NO_DISPONIBLE");
      }

      let hash: string;
      let activado = false;
      if (credencial.tipo === "CODIGO") {
        hash = this.hasheador.sha256(CodigoDeAcceso.crear(credencial.codigo).valor);
        const activacion = await this.participantes.activarCodigo(sesion.id, hash);
        if (activacion === "NO_EXISTE") throw new ErrorDeDominio("CODIGO_NO_EXISTE");
        activado = activacion === "ACTIVADO";
      } else {
        if (sesion.modo !== "SALA_ABIERTA") throw new ErrorDeDominio("MODO_REQUIERE_CODIGO");
        if (!UUID_V4.test(credencial.token)) throw new ErrorDeDominio("TOKEN_INVALIDO");
        hash = this.hasheador.sha256(credencial.token);
      }

      let participante = await this.participantes.porCredencial(sesion.id, hash);
      if (participante === null) {
        participante = {
          id: this.ids.nuevo(),
          sesionId: sesion.id,
          credencial: credencial.tipo,
          hash,
          creadoEn: this.reloj.ahora(),
        } satisfies Participante;
        participante = await this.participantes.crear(participante);
      }
      if (activado) {
        sesion.registrarCambio();
        await this.sesiones.guardar(sesion);
      }
      return { participanteId: participante.id, sesionId: sesion.id };
    });
  }
}
