const VENTANA_MS = 60_000;
const MAXIMO = 1000;

/**
 * Tope de claves en memoria por limitador. Sin un proxy que reescriba x-forwarded-for, un
 * cliente puede inventar una IP por petición; sin tope, el mapa crecería hasta agotar la
 * memoria de la instancia. 10.000 claves son unos pocos MB y superan con holgura las IP
 * distintas que una instancia ve en un minuto en una general de 3.000 personas.
 */
export const MAXIMO_DE_CLAVES = 10_000;

/**
 * Participantes nuevos por minuto desde una IP con token de navegador (sala abierta).
 * Un auditorio detrás de un solo NAT que escanea el QR en unos 10 minutos son unas 300
 * entradas por minuto para 3.000 personas; quien quede por encima ve "Espera un momento" y
 * reintenta. Cada instancia lleva su cuenta, así que el tope real es algo mayor.
 */
export const MAXIMO_DE_INGRESOS_POR_NAVEGADOR = 300;

interface Ventana {
  cuenta: number;
  vence: number;
}

/**
 * Ventana fija por clave, en memoria del proceso. Es un paliativo contra abusos obvios:
 * cada instancia serverless lleva su propia cuenta y se pierde al reiniciar. El techo es
 * alto a propósito: un auditorio entero comparte una IP de NAT, así que solo frena inundaciones.
 * La clave vive solo en memoria, nunca se guarda. El mapa no pasa de `maximoDeClaves`: con
 * el mapa lleno se borran primero las ventanas vencidas y, si no alcanza, la más vieja.
 */
export class LimiteDeTasa {
  // Un Map recorre en orden de inserción: la primera clave es la ventana más vieja.
  private readonly ventanas = new Map<string, Ventana>();
  private proximaPurga = 0;
  private readonly maximoInicial: number;

  constructor(
    private maximo = MAXIMO,
    private readonly ventanaMs = VENTANA_MS,
    private readonly ahora: () => number = Date.now,
    private readonly maximoDeClaves = MAXIMO_DE_CLAVES,
  ) {
    this.maximoInicial = maximo;
  }

  permite(clave: string): boolean {
    const ahora = this.ahora();
    this.purgar(ahora);
    const actual = this.ventanas.get(clave);
    if (actual !== undefined && actual.vence > ahora) {
      actual.cuenta += 1;
      return actual.cuenta <= this.maximo;
    }
    // Vencida o nueva: se borra y se vuelve a insertar para que quede al final del orden.
    this.ventanas.delete(clave);
    this.hacerEspacio(ahora);
    this.ventanas.set(clave, { cuenta: 1, vence: ahora + this.ventanaMs });
    return true;
  }

  tamano(): number {
    return this.ventanas.size;
  }

  /** Vacía las cuentas; con `maximo` también cambia el techo (las pruebas lo bajan). */
  reiniciar(maximo = this.maximoInicial): void {
    this.maximo = maximo;
    this.ventanas.clear();
  }

  private hacerEspacio(ahora: number): void {
    if (this.ventanas.size < this.maximoDeClaves) return;
    this.borrarVencidas(ahora);
    while (this.ventanas.size >= this.maximoDeClaves) {
      const masVieja = this.ventanas.keys().next();
      if (masVieja.done === true) return;
      this.ventanas.delete(masVieja.value);
    }
  }

  private purgar(ahora: number): void {
    if (ahora < this.proximaPurga) return;
    this.proximaPurga = ahora + this.ventanaMs;
    this.borrarVencidas(ahora);
  }

  /**
   * Todas las ventanas duran lo mismo y se insertan en orden de tiempo, así que las vencidas
   * son un prefijo del mapa: el recorrido para en la primera viva. Con el mapa lleno de
   * claves vivas cada inserción cuesta O(1), no un barrido de 10.000.
   */
  private borrarVencidas(ahora: number): void {
    for (const [clave, ventana] of this.ventanas) {
      if (ventana.vence > ahora) return;
      this.ventanas.delete(clave);
    }
  }
}

/**
 * IP del cliente, solo para limitar `ingresar`. `cf-connecting-ip` se lee únicamente con
 * KUORUM_DETRAS_DE_CLOUDFLARE=1: Vercel deja pasar cabeceras ajenas y, sin Cloudflare
 * delante, un cliente podría inventarla y rotarla. Si no, un solo valor de
 * x-forwarded-for (el primero) o x-real-ip.
 */
export function ipDe(solicitud: Request): string | null {
  if (process.env["KUORUM_DETRAS_DE_CLOUDFLARE"] === "1") {
    const cloudflare = solicitud.headers.get("cf-connecting-ip")?.trim();
    if (cloudflare) return cloudflare;
  }
  const reenviada = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (reenviada) return reenviada;
  const real = solicitud.headers.get("x-real-ip")?.trim();
  return real ? real : null;
}

/** Límite de `ingresar` por IP. Los votos nunca se limitan por IP (ver `limitesDeVotos`). */
export const limitesPublicos = new LimiteDeTasa();

/** Límite de votos por participante (id de la cookie firmada), contra inundaciones. */
export const limitesDeVotos = new LimiteDeTasa();

/** Participantes nuevos por IP con token de navegador: frena inflar el conteo de una sala abierta. */
export const limitesDeIngresoPorNavegador = new LimiteDeTasa(MAXIMO_DE_INGRESOS_POR_NAVEGADOR);

/** Sin IP legible no se limita: es mejor que bloquear a todos en un mismo cupo. */
export function excedeElLimiteDeIngreso(solicitud: Request): boolean {
  const ip = ipDe(solicitud);
  return ip !== null && !limitesPublicos.permite(`ingresar|${ip}`);
}

/** Igual que el anterior, solo para ingresos con token de navegador sin cookie válida. */
export function excedeElLimiteDeIngresoPorNavegador(solicitud: Request): boolean {
  const ip = ipDe(solicitud);
  return ip !== null && !limitesDeIngresoPorNavegador.permite(`navegador|${ip}`);
}

export function excedeElLimiteDeVotos(participanteId: string): boolean {
  return !limitesDeVotos.permite(participanteId);
}
