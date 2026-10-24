export type Tema = "claro" | "oscuro" | "sistema";
export type TemaEfectivo = "claro" | "oscuro";

export const CLAVE_DE_TEMA = "kuorum-tema";
export const TEMAS: readonly Tema[] = ["claro", "oscuro", "sistema"];

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

export function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_DE_TEMA);
    return esTema(guardado) ? guardado : "sistema";
  } catch {
    return "sistema";
  }
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_DE_TEMA, tema);
  } catch {
    // Sin almacenamiento el tema vale solo para esta visita.
  }
}

// "sistema" quita el atributo para que mande prefers-color-scheme.
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);
}

// Va en un <script> del <head> para fijar data-tema antes del primer pintado.
export const SCRIPT_DE_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  CLAVE_DE_TEMA,
)});if(t==="claro"||t==="oscuro")document.documentElement.setAttribute("data-tema",t)}catch(e){}})()`;

// El interruptor alterna claro y oscuro. Si lo elegido coincide con el sistema se guarda "sistema",
// así la página vuelve a seguir al sistema operativo sin un tercer botón.
export function siguienteTema(actual: TemaEfectivo, delSistema: TemaEfectivo): Tema {
  const otro: TemaEfectivo = actual === "oscuro" ? "claro" : "oscuro";
  return otro === delSistema ? "sistema" : otro;
}
