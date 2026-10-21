import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export async function entrarALaMesa(
  page: Page,
  correo = process.env["E2E_CORREO"] ?? "",
  contrasena = process.env["E2E_CONTRASENA"] ?? "",
): Promise<void> {
  await page.goto("/mesa/ingresar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/mesa");
}

export async function mesaAutenticada(
  browser: Browser,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ storageState: "test-results/mesa.json" });
  return { ctx, page: await ctx.newPage() };
}

export async function demoAutenticada(
  browser: Browser,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ storageState: "test-results/demo.json" });
  return { ctx, page: await ctx.newPage() };
}

/** Crea la sesión por el formulario y devuelve su código de sala y su ruta. */
export async function crearSesion(
  page: Page,
  titulo: string,
  modo: "Con códigos" | "Sala abierta",
): Promise<{ sala: string; ruta: string }> {
  // Título único por corrida, para no abrir una sesión de una corrida anterior.
  titulo = `${titulo} ${Date.now().toString(36)}`;
  await page.goto("/mesa");
  await page.getByLabel("Título").fill(titulo);
  await page.getByRole("radio", { name: new RegExp(modo) }).check();
  await page.getByRole("button", { name: "Crear sesión" }).click();
  await page
    .getByRole("link", { name: new RegExp(titulo) })
    .first()
    .click();
  await page.waitForURL(/\/mesa\/sesiones\/[^/]+$/);
  const sala = (
    await page
      .getByText(/^Sala /)
      .first()
      .locator("strong")
      .innerText()
  ).trim();
  return { sala, ruta: new URL(page.url()).pathname };
}

export async function crearPregunta(page: Page, texto: string): Promise<void> {
  await page.getByLabel("Pregunta", { exact: true }).fill(texto);
  await page.getByRole("button", { name: "Crear pregunta" }).click();
  await page.getByRole("button", { name: /Abrir la votación/ }).click();
  await expect(page.getByRole("button", { name: "Cerrar votación" })).toBeVisible();
}

export async function nuevoCelular(
  browser: Browser,
  ancho = 360,
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 780 } });
  return { ctx, page: await ctx.newPage() };
}
