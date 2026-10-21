import { expect, test, type Page } from "@playwright/test";
import { crearPregunta, crearSesion, mesaAutenticada } from "./ayudas";

const ANCHOS = [360, 768, 1280, 1920] as const;

async function sinDesbordeHorizontal(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await expect(page.locator("main, [role=main], h1").first()).toBeVisible();
  await page.waitForTimeout(500);
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho, `${ruta} desborda: ${ancho} > ${visible}`).toBeLessThanOrEqual(visible);
}

test("ninguna pantalla desborda en 360, 768, 1280 y 1920", async ({ browser }) => {
  const mesa = await mesaAutenticada(browser);
  const { sala, ruta } = await crearSesion(mesa.page, "Sesión responsive", "Con códigos");
  await mesa.page.getByRole("button", { name: "Iniciar sesión" }).click();
  await crearPregunta(mesa.page, "¿Aprueba la asamblea el pliego de exigencias de bienestar?");

  for (const ancho of ANCHOS) {
    const alto = ancho >= 1280 ? 800 : 780;
    // Mesa: la sesión guardada abre el panel y las rutas de códigos.
    await mesa.page.setViewportSize({ width: ancho, height: alto });
    for (const destino of ["/mesa", ruta, `${ruta}/codigos`, `${ruta}/entregar`]) {
      await sinDesbordeHorizontal(mesa.page, destino);
    }

    // Públicas, sin sesión de mesa.
    const publico = await browser.newContext({ viewport: { width: ancho, height: alto } });
    const page = await publico.newPage();
    for (const destino of ["/", "/mesa/ingresar", `/s/${sala}`, `/proyeccion/${sala}`]) {
      await sinDesbordeHorizontal(page, destino);
    }
    await publico.close();
  }
});
