import { expect, test } from "@playwright/test";
import { crearPregunta, crearSesion, mesaAutenticada, nuevoCelular } from "./ayudas";

test("de la votación al acta verificada", async ({ browser }) => {
  const mesa = await mesaAutenticada(browser);
  const { sala, ruta } = await crearSesion(
    mesa.page,
    "Asamblea con acta",
    "Con códigos",
    "Informe de la mesa\nPliego de bienestar",
  );
  const titulo = (await mesa.page.getByRole("heading", { level: 1 }).innerText()).trim();
  await mesa.page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(mesa.page.getByRole("button", { name: "Terminar sesión" })).toBeVisible();

  await mesa.page.goto(`${ruta}/codigos`);
  await mesa.page.getByLabel(/Cantidad de códigos/).fill("1");
  await mesa.page.getByRole("button", { name: "Generar" }).click();
  await mesa.page.getByText("Estos códigos se muestran una sola vez.").waitFor();
  const codigos = await mesa.page
    .locator("article p.num, article [class*=codigoImpreso]")
    .allInnerTexts();
  await mesa.page.goto(ruta);

  await crearPregunta(mesa.page, "¿Aprueba la asamblea el pliego?");
  const celular = await nuevoCelular(browser);
  await celular.page.goto(`/s/${sala}`);
  await celular.page.getByLabel("Tu código de acceso").fill(codigos[0]!);
  await celular.page.getByRole("button", { name: "Entrar a la sala" }).click();
  await celular.page.getByRole("radio", { name: "Sí" }).check({ force: true });
  await celular.page.getByRole("button", { name: "Votar" }).click();
  await expect(
    celular.page.getByRole("heading", { name: "Tu voto quedó registrado" }),
  ).toBeVisible();

  await mesa.page.getByRole("button", { name: "Cerrar votación" }).click();
  await mesa.page.getByLabel("Enunciado").fill("Se aprueba el pliego de bienestar.");
  await mesa.page.getByRole("button", { name: "Guardar enunciado" }).click();
  await expect(mesa.page.getByLabel("Enunciado")).toHaveValue("Se aprueba el pliego de bienestar.");

  await mesa.page.getByRole("button", { name: "Terminar sesión" }).click();
  await mesa.page.getByRole("dialog").getByRole("button", { name: "Terminar sesión" }).click();
  await mesa.page.getByRole("link", { name: "Acta" }).click();
  await mesa.page.waitForURL(/\/acta$/);
  await expect(mesa.page.getByRole("main")).toContainText("Pliego de bienestar");

  await mesa.page.getByLabel("Desarrollo").fill("Se discutió el pliego.\n\nSe votó a favor.");
  await mesa.page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(mesa.page.getByText("Borrador guardado.")).toBeVisible();
  await mesa.page.getByRole("button", { name: "Finalizar acta" }).click();
  await mesa.page.getByRole("button", { name: "Sí, finalizar" }).click();
  await expect(mesa.page.getByRole("heading", { name: "Acta final" })).toBeVisible();
  const codigo = (await mesa.page.locator("p", { hasText: "Código de verificación:" }).innerText())
    .split(":")[1]!
    .trim();
  expect(codigo).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);

  const id = ruta.split("/").pop()!;
  const pdf = await mesa.page.request.get(`/api/public/v1/actas/${id}.pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const publico = await browser.newPage();
  await publico.goto(`/actas/verificar?codigo=${codigo.toLowerCase().replace("-", " ")}`);
  await expect(publico.getByRole("heading", { name: "Acta auténtica" })).toBeVisible();
  await expect(publico.getByRole("main")).toContainText(titulo);
  await publico.goto("/actas/verificar?codigo=AAAAA-AAAAA");
  await expect(publico.getByText("No encontramos un acta con ese código")).toBeVisible();

  const r = await publico.request.get("/api/public/v1/decisiones");
  const { decisiones } = (await r.json()) as {
    decisiones: { sesion: { titulo: string }; enunciado: string | null }[];
  };
  const mia = decisiones.find((d) => d.sesion.titulo === titulo);
  expect(mia?.enunciado).toBe("Se aprueba el pliego de bienestar.");
});
