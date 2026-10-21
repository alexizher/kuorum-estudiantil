/** Memoria del navegador para lo que el participante recuerda entre visitas. */
export interface Almacen {
  leer(clave: string): string | null;
  escribir(clave: string, valor: string): void;
  borrar(clave: string): void;
}

/** localStorage puede faltar o lanzar (modo privado, datos bloqueados): entonces no se recuerda nada. */
export function almacenDelNavegador(): Almacen {
  return {
    leer(clave) {
      try {
        return window.localStorage.getItem(clave);
      } catch {
        return null;
      }
    },
    escribir(clave, valor) {
      try {
        window.localStorage.setItem(clave, valor);
      } catch {
        // sin almacenamiento la página sigue funcionando, solo que no recuerda
      }
    },
    borrar(clave) {
      try {
        window.localStorage.removeItem(clave);
      } catch {
        // ver arriba
      }
    },
  };
}

export function leerLista(almacen: Almacen, clave: string): string[] {
  try {
    const valor: unknown = JSON.parse(almacen.leer(clave) ?? "[]");
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const MAXIMO_RECORDADO = 20;

export function escribirLista(almacen: Almacen, clave: string, lista: readonly string[]): void {
  almacen.escribir(clave, JSON.stringify(lista.slice(-MAXIMO_RECORDADO)));
}
