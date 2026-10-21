import type { EstadoDeSala } from "@kuorum/contracts";
import { vi } from "vitest";
import type { Almacen } from "../../src/vistas/participante/almacen";
import type { ClienteDeSala } from "../../src/vistas/participante/cliente-de-sala";
import type { FuenteDeEstado } from "../../src/tiempo-real/fuente-de-estado";

export class AlmacenEnMemoria implements Almacen {
  readonly datos = new Map<string, string>();
  leer(clave: string): string | null {
    return this.datos.get(clave) ?? null;
  }
  escribir(clave: string, valor: string): void {
    this.datos.set(clave, valor);
  }
  borrar(clave: string): void {
    this.datos.delete(clave);
  }
}

export function clienteFalso() {
  return {
    ingresar: vi.fn<ClienteDeSala["ingresar"]>(async () => undefined),
    votar: vi.fn<ClienteDeSala["votar"]>(async () => undefined),
    pedirPalabra: vi.fn<ClienteDeSala["pedirPalabra"]>(async () => "s-1"),
    presentarMocion: vi.fn<ClienteDeSala["presentarMocion"]>(async () => "s-2"),
    retirar: vi.fn<ClienteDeSala["retirar"]>(async () => undefined),
  };
}

export class FuenteFalsa implements FuenteDeEstado {
  alCambiar: ((estado: EstadoDeSala) => void) | undefined;
  alNoExistir: (() => void) | undefined;
  alIntentar: ((conExito: boolean) => void) | undefined;
  codigo: string | undefined;
  canceladas = 0;
  suscribir(
    codigo: string,
    alCambiar: (estado: EstadoDeSala) => void,
    alNoExistir?: () => void,
    alIntentar?: (conExito: boolean) => void,
  ): () => void {
    this.codigo = codigo;
    this.alCambiar = alCambiar;
    this.alNoExistir = alNoExistir;
    this.alIntentar = alIntentar;
    return () => {
      this.canceladas++;
    };
  }
}

type Solicitud = EstadoDeSala["palabra"]["fila"][number];

export function enFila(id: string, nombre = "Alguien"): Solicitud {
  return { id, nombre, tipo: "INTERVENCION", mocion: null };
}

export function mocionEnFila(id: string, mocion: NonNullable<Solicitud["mocion"]>): Solicitud {
  return { id, nombre: "Alguien", tipo: "MOCION", mocion };
}
