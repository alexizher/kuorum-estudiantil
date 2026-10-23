import { expect, test, type Page } from "@playwright/test";
import { crearSesion, demoAutenticada, entrarALaMesa, mesaAutenticada } from "./ayudas";

function manana(): string {
  const fecha = new Date(Date.now() + 86_400_000);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

async function programar(page: Page, titulo: string, desde: string, hasta: string): Promise<void> {
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Fecha").fill(manana());
  await page.getByLabel("Desde").fill(desde);
  await page.getByLabel("Hasta").fill(hasta);
}

test("la administración crea una facultad y una encargada que programa en ella", async ({
  browser,
}) => {
  const marca = Date.now().toString(36);
  const facultad = `Facultad de Prueba ${marca}`;
  const slug = `facultad-de-prueba-${marca}`;
  const correo = `encargada-${marca}@example.test`;

  // 1. El SUPERADMIN agrega la facultad.
  const jefe = await mesaAutenticada(browser);
  await jefe.page.goto("/mesa/institucion");
  await jefe.page.getByLabel("Nombre de la nueva facultad").fill(facultad);
  await jefe.page.getByRole("button", { name: "Agregar facultad" }).click();
  await expect(jefe.page.getByRole("list", { name: "Cuerpos activos" })).toContainText(facultad);

  // 2. Agrega a la persona, la pone en la facultad y la hace encargada.
  await jefe.page.goto("/mesa/personal");
  await jefe.page.getByLabel("Correo").fill(correo);
  await jefe.page.getByLabel("Nombre").fill(`Encargada ${marca}`);
  await jefe.page.getByRole("button", { name: "Agregar persona" }).click();
  const hoja = jefe.page.getByRole("dialog");
  await expect(hoja).toContainText("No se vuelve a mostrar");
  const contrasena = (await hoja.locator("p").first().innerText()).trim();
  await hoja.getByRole("button", { name: "Ya la entregué" }).click();
  const tarjeta = jefe.page.getByRole("article", { name: `Encargada ${marca}` });
  await tarjeta.getByLabel("Agregar a").selectOption({ label: facultad });
  await tarjeta.getByRole("button", { name: "Agregar" }).click();
  await tarjeta.getByLabel(`Rol en ${facultad}`).selectOption("ENCARGADO");
  await expect(tarjeta.getByLabel(`Rol en ${facultad}`)).toHaveValue("ENCARGADO");

  // 3. La encargada entra: solo puede programar en su facultad.
  const ctx = await browser.newContext();
  const encargada = await ctx.newPage();
  await entrarALaMesa(encargada, correo, contrasena);
  await expect(encargada.getByLabel("Cuerpo")).toHaveCount(0);
  await expect(encargada.getByRole("main")).toContainText(facultad);

  await programar(encargada, `Asamblea A ${marca}`, "14:00", "16:00");
  await encargada.getByRole("button", { name: "Crear sesión" }).click();
  await expect(
    encargada.getByRole("link", { name: new RegExp(`Asamblea A ${marca}`) }),
  ).toBeVisible();

  await programar(encargada, `Asamblea B ${marca}`, "15:00", "17:00");
  await expect(encargada.getByText("Se cruza con:")).toBeVisible();
  await expect(encargada.getByRole("status").filter({ hasText: "Se cruza con" })).toContainText(
    `Asamblea A ${marca}`,
  );
  await encargada.getByRole("button", { name: "Crear sesión" }).click();
  await expect(
    encargada.getByRole("link", { name: new RegExp(`Asamblea B ${marca}`) }),
  ).toBeVisible();

  // 4. El calendario público las muestra, en la web y en el .ics.
  const publico = await browser.newPage();
  await publico.goto(`/calendario?vista=lista&cuerpo=${slug}`);
  await expect(publico.getByRole("main")).toContainText(`Asamblea A ${marca}`);
  await expect(publico.getByRole("main")).toContainText(`Asamblea B ${marca}`);
  const ics = await publico.request.get(`/api/public/v1/calendario.ics?cuerpo=${slug}`);
  expect(ics.headers()["content-type"]).toBe("text/calendar; charset=utf-8");
  expect((await ics.text()).match(/BEGIN:VEVENT/g)).toHaveLength(2);
});

test("lo que programa la cuenta de prueba no sale en el calendario público", async ({
  browser,
}) => {
  const demo = await demoAutenticada(browser);
  await crearSesion(demo.page, "Ensayo de la cuenta de prueba", "Sala abierta");
  const titulo = (await demo.page.getByRole("heading", { level: 1 }).innerText()).trim();

  const publico = await browser.newPage();
  await publico.goto("/calendario?vista=lista");
  await expect(publico.getByRole("heading", { name: "Próximas sesiones" })).toBeVisible();
  await expect(publico.getByRole("main")).not.toContainText(titulo);
});
