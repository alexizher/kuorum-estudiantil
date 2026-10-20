import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  BloqueDeTinta,
  Boton,
  CampoDeTexto,
  Cronometro,
  DefinicionesDeTinta,
  HojaInferior,
  Pestanas,
  Qr,
  SelectorDeTema,
  TemaProvider,
  clasesDeBoton,
} from "../src/index.js";
import { violacionesDeAxe } from "./axe.js";

function Pagina({ children }: { children: ReactNode }) {
  return (
    <TemaProvider>
      <main>
        <h1>Página</h1>
        {children}
      </main>
    </TemaProvider>
  );
}

function PestanasDeEjemplo() {
  const [actual, setActual] = useState("votar");
  return (
    <>
      <Pestanas
        etiqueta="Secciones"
        elementos={[
          { id: "votar", etiqueta: "Votar" },
          { id: "palabra", etiqueta: "Palabra", aviso: "6", etiquetaDelAviso: "Lugar en la fila" },
        ]}
        seleccionada={actual}
        alSeleccionar={setActual}
      />
      <div
        role="tabpanel"
        id="panel-votar"
        aria-labelledby="pestana-votar"
        hidden={actual !== "votar"}
      >
        Votar
      </div>
      <div
        role="tabpanel"
        id="panel-palabra"
        aria-labelledby="pestana-palabra"
        hidden={actual !== "palabra"}
      >
        Palabra
      </div>
    </>
  );
}

function todo() {
  return (
    <Pagina>
      <DefinicionesDeTinta />
      <SelectorDeTema />
      <Boton>Votar</Boton>
      <Boton variante="tinta" ancho>
        Entrar
      </Boton>
      <Boton variante="peligro">Salir de la fila</Boton>
      <Boton disabled>No disponible</Boton>
      <CampoDeTexto etiqueta="Correo" type="email" />
      <CampoDeTexto
        etiqueta="Código de la sala"
        ayuda="Son 4 caracteres."
        error="Falta un carácter"
      />
      <PestanasDeEjemplo />
      <HojaInferior abierta titulo="Presentar una moción" alCerrar={() => undefined}>
        <p>Elige el tipo.</p>
        <Boton>Presentar</Boton>
      </HojaInferior>
      <Cronometro restantes={82} total={180} />
      <Qr valor="K7F2" etiqueta="Código QR de la sala K7F2" />
      <div role="list">
        <BloqueDeTinta color="si" cifra={742} porcentaje="64,2 %" proporcion={1} etiqueta="Sí" />
        <BloqueDeTinta color="no" cifra={318} porcentaje="27,5 %" proporcion={0.43} etiqueta="No" />
      </div>
    </Pagina>
  );
}

describe("accesibilidad con axe", () => {
  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones con el tema ${tema}`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      localStorage.setItem("kuorum-tema", tema);
      const { container } = render(todo());
      expect(await violacionesDeAxe(container)).toEqual([]);
    });
  }
});

describe("Boton", () => {
  it("dispara el clic y respeta disabled", async () => {
    const alClic = vi.fn();
    const { rerender } = render(<Boton onClick={alClic}>Votar</Boton>);
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));
    expect(alClic).toHaveBeenCalledTimes(1);
    rerender(
      <Boton onClick={alClic} disabled>
        Votar
      </Boton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));
    expect(alClic).toHaveBeenCalledTimes(1);
  });

  it("clasesDeBoton sirve también para enlaces", () => {
    expect(clasesDeBoton({ variante: "tinta", ancho: true })).toBe(
      "boton boton--tinta boton--ancho",
    );
    expect(clasesDeBoton({})).toBe("boton");
  });
});

describe("CampoDeTexto", () => {
  it("asocia etiqueta, ayuda y error", () => {
    render(<CampoDeTexto etiqueta="Correo" ayuda="El de la mesa." error="No es un correo" />);
    const campo = screen.getByLabelText("Correo");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    const descripcion = campo.getAttribute("aria-describedby") ?? "";
    expect(descripcion.split(" ")).toHaveLength(2);
    expect(screen.getByRole("alert").textContent).toBe("No es un correo");
  });

  it("sin error no marca invalid ni crea alerta", () => {
    render(<CampoDeTexto etiqueta="Correo" />);
    expect(screen.getByLabelText("Correo").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Pestanas", () => {
  it("cambia con clic y con flechas, con tabindex móvil", async () => {
    render(<PestanasDeEjemplo />);
    const votar = screen.getByRole("tab", { name: "Votar" });
    const palabra = screen.getByRole("tab", { name: /Palabra/ });
    expect(votar.getAttribute("aria-selected")).toBe("true");
    expect(palabra.getAttribute("tabindex")).toBe("-1");
    votar.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(palabra.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(palabra);
    await userEvent.keyboard("{ArrowRight}");
    expect(votar.getAttribute("aria-selected")).toBe("true");
    await userEvent.click(palabra);
    expect(palabra.getAttribute("aria-selected")).toBe("true");
  });

  it("muestra el aviso con su etiqueta", () => {
    render(<PestanasDeEjemplo />);
    expect(screen.getByLabelText("Lugar en la fila").textContent).toBe("6");
  });
});

describe("HojaInferior", () => {
  it("abierta muestra el título y el cierre llama a alCerrar", async () => {
    const alCerrar = vi.fn();
    render(
      <HojaInferior abierta titulo="Presentar una moción" alCerrar={alCerrar}>
        <p>Contenido</p>
      </HojaInferior>,
    );
    expect(screen.getByRole("dialog", { name: "Presentar una moción" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("cerrada no se expone", () => {
    render(
      <HojaInferior abierta={false} titulo="Hoja" alCerrar={() => undefined}>
        <p>Contenido</p>
      </HojaInferior>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Cronometro", () => {
  it.each([
    [82, "1:22", ""],
    [30, "0:30", "pronto"],
    [0, "0:00", "fin"],
    [180, "3:00", ""],
    [-4, "0:00", "fin"],
  ])("%i segundos se muestra %s con aviso '%s'", (segundos, texto, aviso) => {
    render(<Cronometro restantes={segundos} />);
    const reloj = screen.getByLabelText("Tiempo restante");
    expect(reloj.textContent).toBe(texto);
    expect(reloj.getAttribute("data-aviso") ?? "").toBe(aviso);
  });

  it("con total dibuja la barra de lo usado", () => {
    const { container } = render(<Cronometro restantes={90} total={180} />);
    const llena = container.querySelector<HTMLElement>(".barra__llena");
    expect(llena?.style.width).toBe("50%");
  });
});

describe("BloqueDeTinta", () => {
  it("expone cifra, porcentaje y etiqueta como un solo elemento de lista", () => {
    render(
      <div role="list">
        <BloqueDeTinta color="si" cifra={742} porcentaje="64,2 %" proporcion={1} etiqueta="Sí" />
      </div>,
    );
    expect(screen.getByRole("listitem", { name: "Sí: 742 votos, 64,2 %" })).toBeTruthy();
  });

  it("la altura sale de la proporción y se acota a 0 y 1", () => {
    const { container } = render(
      <div role="list">
        <BloqueDeTinta color="no" cifra={1} porcentaje="1 %" proporcion={3} etiqueta="No" />
        <BloqueDeTinta color="no" cifra={1} porcentaje="1 %" proporcion={-1} etiqueta="No" />
      </div>,
    );
    const altos = [...container.querySelectorAll<HTMLElement>(".columna")].map((c) =>
      c.style.getPropertyValue("--alto"),
    );
    expect(altos).toEqual(["100%", "0%"]);
  });

  it("DefinicionesDeTinta aporta el filtro con id 'tinta'", () => {
    const { container } = render(<DefinicionesDeTinta />);
    expect(container.querySelector("filter#tinta feTurbulence")).not.toBeNull();
    expect(container.querySelector("filter#tinta feDisplacementMap")).not.toBeNull();
  });
});
