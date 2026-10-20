const VENTANA_MS = 60_000;
const MAXIMO = 60;

/**
 * Ventana fija por clave, en memoria del proceso. Es un paliativo contra abusos obvios:
 * cada instancia serverless lleva su propia cuenta y se pierde al reiniciar. Quien comparte
 * IP (una red de colegio) comparte cupo. La clave vive solo en memoria, nunca se guarda.
 */
export class LimiteDeTasa {
  private readonly ventanas = new Map<string, { cuenta: number; vence: number }>();
  private proximaPurga = 0;

  constructor(
    private readonly maximo = MAXIMO,
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

  reiniciar(): void {
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

/** Un solo valor de x-forwarded-for (el primero) o x-real-ip. */
export function ipDe(solicitud: Request): string | null {
  const reenviada = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (reenviada) return reenviada;
  const real = solicitud.headers.get("x-real-ip")?.trim();
  return real ? real : null;
}

export const limitesPublicos = new LimiteDeTasa();

/** Sin IP legible no se limita: es mejor que bloquear a todos en un mismo cupo. */
export function excedeElLimite(solicitud: Request, accion: "ingresar" | "votos"): boolean {
  const ip = ipDe(solicitud);
  return ip !== null && !limitesPublicos.permite(`${accion}|${ip}`);
}
