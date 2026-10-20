export class ErrorDeDominio extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensaje?: string) {
    super(mensaje ?? codigo);
    this.name = new.target.name;
    this.codigo = codigo;
  }
}

export class SesionNoEncontrada extends ErrorDeDominio {
  constructor(sesionId: string) {
    super("SESION_NO_ENCONTRADA", `Sesión ${sesionId} no encontrada`);
  }
}
