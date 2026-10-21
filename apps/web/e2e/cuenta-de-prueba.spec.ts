import { expect, test } from "@playwright/test";
import { crearSesion, demoAutenticada, mesaAutenticada } from "./ayudas";

// El servidor de las pruebas arranca con KUORUM_MODO_DEMO=1 (playwright.config.ts). El caso sin
// la bandera lo cubre test/ingreso-con-cuenta-de-prueba.test.tsx, porque aquí el servidor es uno.
test("el ingreso muestra la cuenta de prueba y su botón llena el formulario", async ({ page }) => {
  await page.goto("/mesa/ingresar");
  const bloque = page.getByRole("region", { name: "Cuenta de prueba" });
  await expect(bloque).toContainText("prueba-publica@example.test");
  await expect(bloque).toContainText("contrasena-publica-de-e2e");
  await expect(bloque).toContainText(
    "Es pública: cualquiera puede verla. Sus sesiones se borran cada día.",
  );

  await page.getByRole("button", { name: "Usar la cuenta de prueba" }).click();
  await expect(page.getByLabel("Correo")).toHaveValue("prueba-publica@example.test");
  await expect(page.getByLabel("Contraseña")).toHaveValue("contrasena-publica-de-e2e");
});

test("la cuenta de prueba no ve ni abre una sesión de la superadministración", async ({
  browser,
}) => {
  const jefe = await mesaAutenticada(browser);
  const { ruta } = await crearSesion(jefe.page, "Sesión del dueño", "Sala abierta");
  const id = ruta.split("/").pop() ?? "";

  const demo = await demoAutenticada(browser);
  // Por la dirección, 404 como si no existiera.
  const respuesta = await demo.page.goto(ruta);
  expect(respuesta?.status()).toBe(404);
  await demo.page.goto(`${ruta}/codigos`).then((r) => expect(r?.status()).toBe(404));

  // Por la API, el mismo 404 que una sesión inexistente.
  const ajena = await demo.page.request.get(`/api/mesa/v1/sesiones/${id}/preguntas`);
  const inexistente = await demo.page.request.get("/api/mesa/v1/sesiones/no-existe/preguntas");
  expect(ajena.status()).toBe(404);
  expect(inexistente.status()).toBe(404);
  expect(await ajena.json()).toEqual(await inexistente.json());
  const iniciar = await demo.page.request.post(`/api/mesa/v1/sesiones/${id}/iniciar`);
  expect(iniciar.status()).toBe(404);

  // Y no aparece en su lista.
  await demo.page.goto("/mesa");
  await expect(demo.page.getByRole("heading", { name: "Sesiones" })).toBeVisible();
  await expect(demo.page.getByText(/Sesión del dueño/)).toHaveCount(0);
  const lista = await demo.page.request.get("/api/mesa/v1/sesiones");
  expect(JSON.stringify(await lista.json())).not.toContain(id);

  // La sesión sigue intacta para el dueño.
  await jefe.page.goto(ruta);
  await expect(jefe.page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
});

test("la cuenta de prueba trabaja con lo suyo, lo ve marcado, y la superadministración también lo ve", async ({
  browser,
}) => {
  const demo = await demoAutenticada(browser);
  await demo.page.goto("/mesa");
  await expect(demo.page.getByRole("banner")).toContainText("Cuenta de prueba");
  const { ruta } = await crearSesion(demo.page, "Prueba pública", "Con códigos");
  await expect(demo.page.getByRole("banner")).toContainText("Cuenta de prueba");
  await demo.page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(demo.page.getByRole("button", { name: "Terminar sesión" })).toBeVisible();

  // Más de 50 códigos en una vez: la API lo rechaza con el mensaje de la cuenta de prueba.
  const demasiados = await demo.page.request.post(
    `${ruta.replace("/mesa/", "/api/mesa/v1/")}/codigos`,
    {
      data: { cantidad: 51 },
    },
  );
  expect(demasiados.status()).toBe(409);
  expect((await demasiados.json()).mensaje).toContain("50 códigos por vez y 200 por sesión");

  const jefe = await mesaAutenticada(browser);
  await jefe.page.goto("/mesa");
  await expect(jefe.page.getByRole("banner")).not.toContainText("Cuenta de prueba");
  await expect(jefe.page.getByText(/Prueba pública/).first()).toBeVisible();
  await jefe.page.goto(ruta);
  await expect(jefe.page.getByRole("button", { name: "Terminar sesión" })).toBeVisible();
});

test("la cuenta de prueba no puede cambiar su contraseña", async ({ browser }) => {
  const demo = await demoAutenticada(browser);
  const respuesta = await demo.page.request.post("/api/auth/change-password", {
    data: { currentPassword: "x".repeat(12), newPassword: "y".repeat(12) },
    headers: { origin: `http://localhost:${process.env["E2E_PUERTO"] ?? 3150}` },
  });
  expect(respuesta.status()).toBe(403);
});
