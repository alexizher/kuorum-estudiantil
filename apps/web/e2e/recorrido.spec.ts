import { expect, test, type Page } from "@playwright/test";
import { crearPregunta, crearSesion, mesaAutenticada, nuevoCelular } from "./ayudas";

test("recorrido de una sala con códigos", async ({ browser }) => {
  const mesa = await mesaAutenticada(browser);
  const { sala, ruta } = await crearSesion(mesa.page, "Asamblea de prueba", "Con códigos");
  await mesa.page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(mesa.page.getByRole("button", { name: "Terminar sesión" })).toBeVisible();

  // Tres códigos desde la pantalla de la mesa.
  await mesa.page.goto(`${ruta}/codigos`);
  await mesa.page.getByLabel(/Cantidad de códigos/).fill("3");
  await mesa.page.getByRole("button", { name: "Generar" }).click();
  await mesa.page.getByText("Estos códigos se muestran una sola vez.").waitFor();
  const codigos = await mesa.page
    .locator("article p.num, article [class*=codigoImpreso]")
    .allInnerTexts();
  expect(codigos).toHaveLength(3);

  await mesa.page.goto(ruta);
  await crearPregunta(mesa.page, "¿Aprueba la asamblea el pliego?");

  const entrar = async (pagina: Page, codigo: string) => {
    await pagina.goto(`/s/${sala}`);
    await pagina.getByLabel("Tu código de acceso").fill(codigo);
    await pagina.getByRole("button", { name: "Entrar a la sala" }).click();
  };

  // Dos navegadores con el mismo código: solo uno vota.
  const a = await nuevoCelular(browser);
  const b = await nuevoCelular(browser);
  await entrar(a.page, codigos[0]!);
  await entrar(b.page, codigos[0]!);
  await a.page.getByRole("radio", { name: "Sí" }).check({ force: true });
  await a.page.getByRole("button", { name: "Votar" }).click();
  await expect(a.page.getByRole("heading", { name: "Tu voto quedó registrado" })).toBeVisible();
  await b.page.getByRole("radio", { name: "No" }).check({ force: true });
  await b.page.getByRole("button", { name: "Votar" }).click();
  // El segundo navegador ve la confirmación, pero el servidor lo rechaza como voto repetido.

  // Un tercero vota con otro código.
  const c = await nuevoCelular(browser);
  await entrar(c.page, codigos[1]!);
  await c.page.getByRole("radio", { name: "No" }).check({ force: true });
  await c.page.getByRole("button", { name: "Votar" }).click();
  await expect(c.page.getByRole("heading", { name: "Tu voto quedó registrado" })).toBeVisible();

  // Fila: el tercero pide la palabra y el primero presenta una moción de orden, que pasa adelante.
  await c.page.getByRole("tab", { name: /Palabra/ }).click();
  await c.page.getByLabel("Cómo quieres que te anuncien").fill("Andrés Cardona");
  await c.page.getByRole("button", { name: "Pedir la palabra" }).click();
  await expect(c.page.getByText(/Vas en el lugar/)).toBeVisible();
  await a.page.getByRole("tab", { name: /Palabra/ }).click();
  await a.page.getByLabel("Cómo quieres que te anuncien").fill("Valentina Ríos");
  await a.page.getByRole("button", { name: "Presentar una moción" }).click();
  await a.page.getByRole("radio", { name: /De orden/ }).check({ force: true });
  await a.page.getByRole("button", { name: "Presentar moción" }).click();
  await expect(a.page.getByText("Tu moción está en la fila")).toBeVisible();
  const fila = mesa.page
    .locator("li")
    .filter({ has: mesa.page.getByRole("button", { name: /Dar la palabra a/ }) });
  await expect(fila).toHaveCount(2);
  await expect(fila.first()).toContainText("Moción de orden");
  await expect(fila.first()).toContainText("Valentina Ríos");
  await expect(fila.last()).toContainText("Andrés Cardona");

  // La mesa cierra, ve el resultado y lo proyecta.
  await mesa.page.getByRole("button", { name: "Cerrar votación" }).click();
  await mesa.page.getByRole("button", { name: "Proyectar resultado" }).click();
  await expect(mesa.page.getByText("El resultado ya está en la proyección.")).toBeVisible();

  const proyeccion = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pantalla = await proyeccion.newPage();
  await pantalla.goto(`/proyeccion/${sala}`);
  await expect(pantalla.getByText(/^2\s+votos emitidos/)).toBeVisible();
  await expect(pantalla.getByRole("list", { name: "Votos por opción" })).toBeVisible();
});

test("la sala abierta se marca como votación indicativa", async ({ browser }) => {
  const mesa = await mesaAutenticada(browser);
  const { sala } = await crearSesion(mesa.page, "Consulta rápida", "Sala abierta");
  await mesa.page.getByRole("button", { name: "Iniciar sesión" }).click();
  await crearPregunta(mesa.page, "¿Se levanta la sesión?");

  const celular = await nuevoCelular(browser);
  await celular.page.goto(`/s/${sala}`);
  await expect(celular.page.getByRole("heading", { name: "¿Se levanta la sesión?" })).toBeVisible();
  await expect(celular.page.getByText("Votación indicativa")).toBeVisible();

  const pantalla = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await pantalla.goto(`/proyeccion/${sala}`);
  await expect(pantalla.getByText("Votación indicativa")).toBeVisible();
});
