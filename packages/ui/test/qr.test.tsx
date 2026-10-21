import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Qr } from "../src/index.js";

describe("Qr", () => {
  it("dibuja un SVG con etiqueta accesible y zona de silencio de 4 módulos", () => {
    const { container } = render(
      <Qr valor="https://kuorum.example/s/K7F2" etiqueta="QR de la sala K7F2" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("QR de la sala K7F2");
    const lado = Number(svg?.getAttribute("viewBox")?.split(" ")[2]);
    // versión 2 (25) como mínimo + 8 de silencio
    expect(lado).toBeGreaterThanOrEqual(25 + 8);
    expect(container.querySelector("path")?.getAttribute("d")?.length).toBeGreaterThan(50);
  });

  it("usa tokens de color, no valores fijos en el marcado", () => {
    const { container } = render(<Qr valor="K7F2" etiqueta="QR" />);
    expect(container.innerHTML).toContain("var(--qr-tinta)");
    expect(container.innerHTML).toContain("var(--qr-fondo)");
  });

  it("el mismo valor da el mismo dibujo y otro valor da otro", () => {
    const a = render(<Qr valor="K7F2" etiqueta="a" />).container.innerHTML;
    const b = render(<Qr valor="K7F2" etiqueta="a" />).container.innerHTML;
    const c = render(<Qr valor="K7F3" etiqueta="a" />).container.innerHTML;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
