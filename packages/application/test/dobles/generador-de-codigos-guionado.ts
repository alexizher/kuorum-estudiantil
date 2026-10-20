import { CodigoDeAcceso, CodigoDeSala, type GeneradorDeCodigos } from "@kuorum/domain";

const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function aTexto(n: number, largo: number): string {
  let resto = n;
  let texto = "";
  for (let i = 0; i < largo; i += 1) {
    texto = ALFABETO[resto % ALFABETO.length] + texto;
    resto = Math.floor(resto / ALFABETO.length);
  }
  return texto;
}

/** Códigos deterministas. `salas` fija los primeros códigos de sala que se devuelven. */
export class GeneradorDeCodigosGuionado implements GeneradorDeCodigos {
  private salas = 0;
  private accesos = 0;

  constructor(private readonly salasFijas: string[] = []) {}

  codigoDeSala(): CodigoDeSala {
    const fijo = this.salasFijas[this.salas];
    const valor = fijo ?? aTexto(this.salas, 4);
    this.salas += 1;
    return CodigoDeSala.crear(valor);
  }

  codigoDeAcceso(): CodigoDeAcceso {
    const n = this.accesos;
    this.accesos += 1;
    return CodigoDeAcceso.crear(`${aTexto(Math.floor(n / 1000), 4)}-${aTexto(n % 1000, 4)}`);
  }
}
