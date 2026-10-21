const VENTANA_MS = 60_000;
const MAXIMO = 1000;

/**
 * Ventana fija por clave, en memoria del proceso. Es un paliativo contra abusos obvios:
 * cada instancia serverless lleva su propia cuenta y se pierde al reiniciar. El techo es
 * alto a propósito: un auditorio entero comparte una IP de NAT, así que solo frena inundaciones.
 * La clave vive solo en memoria, nunca se guarda.
 */
export class LimiteDeTasa {
  private readonly ventanas = new Map<string, { cuenta: number; vence: number }>();
  private proximaPurga = 0;

  constructor(
    private maximo = MAXIMO,
    private readonly ventanaMs = VENTANA_MS,
    private readonly ahora: () => number = Date.now,
  ) {}

  permite(clave: string): boolean {
    const ahora = this.ahora();
    this.purgar(ahora);
    const actual = this.ventanas.get(clave);
    if (actual === undefined) {
      this.ventanas.set(clave, { cuenta: 1, vence: ahora + this.ventanaMs });
      return true;
    }
    actual.cuenta += 1;
    return actual.cuenta <= this.maximo;
  }

  tamano(): number {
    return this.ventanas.size;
  }

  /** Vacía las cuentas; con `maximo` también cambia el techo (las pruebas lo bajan). */
  reiniciar(maximo = MAXIMO): void {
    this.maximo = maximo;
    this.ventanas.clear();
  }

  private purgar(ahora: number): void {
    if (ahora < this.proximaPurga) return;
    this.proximaPurga = ahora + this.ventanaMs;
    for (const [clave, ventana] of this.ventanas) {
      if (ventana.vence <= ahora) this.ventanas.delete(clave);
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

/** Sin IP legible no se limita: es mejor que bloquear a todos en un mismo cupo. */
export function excedeElLimiteDeIngreso(solicitud: Request): boolean {
  const ip = ipDe(solicitud);
  return ip !== null && !limitesPublicos.permite(`ingresar|${ip}`);
}

export function excedeElLimiteDeVotos(participanteId: string): boolean {
  return !limitesDeVotos.permite(participanteId);
}
