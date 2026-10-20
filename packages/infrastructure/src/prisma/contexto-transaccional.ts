import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

export type ClienteTransaccional = Prisma.TransactionClient;

const ESPERA_MAXIMA_MS = 5_000;
const DURACION_MAXIMA_MS = 15_000;

/**
 * Entrega a los repositorios el cliente de la transacción en curso (si hay una unidad de
 * trabajo activa) o el cliente normal. Así los puertos no cambian de firma.
 */
export class ContextoTransaccional {
  private readonly almacen = new AsyncLocalStorage<ClienteTransaccional>();

  constructor(private readonly prisma: PrismaClient) {}

  cliente(): ClienteTransaccional {
    return this.almacen.getStore() ?? this.prisma;
  }

  /** Si ya hay una unidad de trabajo abierta (no se puede reintentar sin abortarla). */
  hayTransaccion(): boolean {
    return this.almacen.getStore() !== undefined;
  }

  /** Reutiliza la transacción actual; si no hay, abre una y la propaga al trabajo. */
  enTransaccion<T>(trabajo: (cliente: ClienteTransaccional) => Promise<T>): Promise<T> {
    const actual = this.almacen.getStore();
    if (actual !== undefined) return trabajo(actual);
    return this.prisma.$transaction((tx) => this.almacen.run(tx, () => trabajo(tx)), {
      maxWait: ESPERA_MAXIMA_MS,
      timeout: DURACION_MAXIMA_MS,
    });
  }
}

/** Violación de índice único, venga del cliente tipado o de SQL crudo. */
export function esViolacionDeUnico(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  const origen = error.meta?.["driverAdapterError"];
  return JSON.stringify(origen ?? "").includes("23505");
}

/** Se venció lock_timeout (SQLSTATE 55P03) al esperar un candado. */
export function esFalloDeCandado(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return JSON.stringify(error.meta ?? "").includes("55P03") || /lock timeout/i.test(error.message);
}
