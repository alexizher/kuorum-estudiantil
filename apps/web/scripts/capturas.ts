/**
 * Genera las capturas de docs/uso/capturas contra una instalación en marcha, con datos de
 * demostración inventados (nada real).
 *
 *   CAPTURAS_URL=http://localhost:3150 E2E_CORREO=... E2E_CONTRASENA=... \
 *     pnpm --filter @kuorum/web capturas
 *
 * Crea una sesión nueva en esa base cada vez. Úsalo contra una base local, no contra producción.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

const BASE = process.env["CAPTURAS_URL"] ?? "http://localhost:3150";
const CORREO = process.env["E2E_CORREO"] ?? "";
const CONTRASENA = process.env["E2E_CONTRASENA"] ?? "";
const SALIDA = resolve(process.argv[2] ?? "../../docs/uso/capturas");
mkdirSync(SALIDA, { recursive: true });

type Tema = "claro" | "oscuro";
interface Vista {
  ancho: number;
  alto: number;
  tema: Tema;
}
const v = (ancho: number, alto: number, tema: Tema): Vista => ({ ancho, alto, tema });

const navegador = await chromium.launch();
const contexto = (
  vista: Vista,
  almacenamiento?: Awaited<ReturnType<BrowserContext["storageState"]>>,
) =>
  navegador.newContext({
    baseURL: BASE,
    viewport: { width: vista.ancho, height: vista.alto },
    colorScheme: vista.tema === "oscuro" ? "dark" : "light",
    ...(almacenamiento ? { storageState: almacenamiento } : {}),
  });

async function foto(page: Page, nombre: string, vista: Vista, completa = false): Promise<void> {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${SALIDA}/${nombre}-${vista.ancho}-${vista.tema}.png`,
    fullPage: completa,
  });
}

// Mesa: una sola entrada (el ingreso admite 5 intentos por minuto).
const ctxMesa = await contexto(v(1440, 900, "claro"));
const pMesa = await ctxMesa.newPage();
await pMesa.goto("/mesa/ingresar");
await pMesa.getByLabel("Correo").fill(CORREO);
await pMesa.getByLabel("Contraseña").fill(CONTRASENA);
await pMesa.getByRole("button", { name: "Entrar" }).click();
await pMesa.waitForURL("**/mesa");
const sesionDeMesa = await ctxMesa.storageState();

const api: APIRequestContext = ctxMesa.request;
const mesa = async <T = unknown>(ruta: string, cuerpo: object = {}): Promise<T> => {
  const r = await api.post(`${BASE}/api/mesa/v1/${ruta}`, { data: cuerpo });
  if (!r.ok()) throw new Error(`${ruta}: ${r.status()} ${await r.text()}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : null) as T;
};

const leer = async <T>(ruta: string): Promise<T> => {
  const r = await api.get(`${BASE}/api/mesa/v1/${ruta}`);
  if (!r.ok()) throw new Error(`${ruta}: ${r.status()} ${await r.text()}`);
  return (await r.json()) as T;
};
const { cuerpos } = await leer<{ cuerpos: { id: string; tipo: string; nombre: string }[] }>(
  "institucion",
);
const general = cuerpos.find((c) => c.tipo === "GENERAL")?.id ?? "";
// Facultades de ejemplo para el calendario y el panel. Si ya existen, se usan.
const crearCuerpo = async (nombre: string): Promise<void> => {
  const r = await api.post(`${BASE}/api/mesa/v1/cuerpos`, { data: { nombre } });
  if (!r.ok() && r.status() !== 409) throw new Error(`cuerpos: ${r.status()} ${await r.text()}`);
};
for (const nombre of ["Facultad de Ingeniería", "Facultad de Artes", "Facultad de Medicina"]) {
  await crearCuerpo(nombre);
}
const conFacultades = (await leer<{ cuerpos: { id: string; nombre: string }[] }>("institucion"))
  .cuerpos;
const idDe = (nombre: string) => conFacultades.find((c) => c.nombre === nombre)?.id ?? general;

const hoy = new Date();
const dia = (desplazamiento: number): string => {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + desplazamiento);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
};
const programar = (titulo: string, cuerpoId: string, fecha: string, desde: string, hasta: string) =>
  mesa<{ id: string; codigoDeSala: string }>("sesiones", {
    titulo,
    modo: "CON_CODIGOS",
    cuerpoId,
    inicio: `${fecha}T${desde}`,
    fin: `${fecha}T${hasta}`,
    modalidad: "PRESENCIAL",
  });
await programar("Asamblea de Ingeniería", idDe("Facultad de Ingeniería"), dia(2), "10:00", "12:00");
await programar("Asamblea de Artes", idDe("Facultad de Artes"), dia(2), "11:00", "13:00");
await programar("Consejo de Medicina", idDe("Facultad de Medicina"), dia(5), "14:00", "16:00");

const sesion = await mesa<{ id: string; codigoDeSala: string }>("sesiones", {
  titulo: "Asamblea General de Estudiantes",
  modo: "CON_CODIGOS",
  segundosPorIntervencion: 180,
  cuerpoId: general,
  inicio: `${dia(0)}T08:00`,
  fin: `${dia(0)}T12:00`,
  modalidad: "MIXTA",
  lugar: "Teatro universitario",
});
const sala = sesion.codigoDeSala;
await mesa(`sesiones/${sesion.id}/iniciar`);
const { codigos } = await mesa<{ codigos: string[] }>(`sesiones/${sesion.id}/codigos`, {
  cantidad: 12,
});
const estado = async () =>
  (
    await fetch(`${BASE}/api/public/v1/salas/${sala}/estado`, {
      headers: { "Cache-Control": "no-cache" },
    })
  ).json() as Promise<{
    pregunta: { id: string; opciones: { id: string; texto: string }[] } | null;
    palabra: { fila: { id: string; nombre: string }[] };
  }>;

// Participantes de relleno, cada uno con su cookie, usando los códigos del 4 en adelante.
async function relleno(
  codigo: string,
): Promise<(ruta: string, cuerpo: object) => Promise<Response>> {
  const r = await fetch(`${BASE}/api/public/v1/salas/${sala}/ingresar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo }),
  });
  const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return (ruta, cuerpo) =>
    fetch(`${BASE}/api/public/v1/salas/${sala}/${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(cuerpo),
    });
}
const gente = [];
for (const codigo of codigos.slice(3)) gente.push(await relleno(codigo));

// 1. Portada
for (const vista of [
  v(360, 780, "claro"),
  v(360, 780, "oscuro"),
  v(1280, 800, "claro"),
  v(1280, 800, "oscuro"),
]) {
  const ctx = await contexto(vista);
  const page = await ctx.newPage();
  await page.goto("/");
  await foto(page, "portada", vista);
  await ctx.close();
}
// Ingreso de la mesa
{
  const vista = v(1280, 800, "claro");
  const ctx = await contexto(vista);
  const page = await ctx.newPage();
  await page.goto("/mesa/ingresar");
  await foto(page, "mesa-ingresar", vista);
  await ctx.close();
}

// Proyección y celulares viven en contextos abiertos para ver cada estado.
const vistasProyeccion = [v(1280, 720, "claro"), v(1280, 720, "oscuro"), v(1920, 1080, "claro")];
const proyecciones: Page[] = [];
for (const vista of vistasProyeccion) {
  const page = await (await contexto(vista)).newPage();
  await page.goto(`/proyeccion/${sala}`);
  proyecciones.push(page);
}
const fotoProyeccion = async (nombre: string): Promise<void> => {
  for (const [i, vista] of vistasProyeccion.entries()) await foto(proyecciones[i]!, nombre, vista);
};
const vistasCelular = [v(360, 780, "claro"), v(360, 780, "oscuro"), v(768, 1024, "claro")];
const celulares: Page[] = [];
for (const vista of vistasCelular) {
  const page = await (await contexto(vista)).newPage();
  await page.goto(`/s/${sala}`);
  celulares.push(page);
}
const fotoCelular = async (nombre: string): Promise<void> => {
  for (const [i, vista] of vistasCelular.entries()) await foto(celulares[i]!, nombre, vista);
};

await proyecciones[0]!.getByRole("heading").first().waitFor();
await fotoProyeccion("proyeccion-esperando");

// 2. Celular: código, sin votación, palabra y hoja de mociones
for (const [i, page] of celulares.entries()) {
  await page.getByLabel("Tu código de acceso").waitFor();
  if (i === 0 || i === 1) {
    await page.getByLabel("Tu código de acceso").fill("zzzz-zzzz");
    await page.getByRole("button", { name: "Entrar a la sala" }).click();
    await page.getByRole("alert").waitFor();
  }
}
await fotoCelular("celular-codigo");
for (const [i, page] of celulares.entries()) {
  await page.getByLabel("Tu código de acceso").fill(codigos[i]!);
  await page.getByRole("button", { name: "Entrar a la sala" }).click();
  await page.getByText("Todavía no hay una votación abierta.").waitFor();
}
await fotoCelular("celular-sin-votacion");
for (const page of celulares) await page.getByRole("tab", { name: /Palabra/ }).click();
await fotoCelular("celular-palabra");
for (const page of celulares) {
  await page.getByRole("button", { name: "Presentar una moción" }).click();
  await page.getByRole("dialog").waitFor();
}
for (const [i, page] of celulares.entries()) {
  await page.waitForTimeout(400);
  if (i < 2) await foto(page, "celular-hoja-de-mociones", vistasCelular[i]!);
  await page.getByRole("button", { name: "Cerrar" }).click();
}

// 3. Fila de relleno y pregunta abierta
const nombres = ["Camila Torres", "Andrés Mejía", "Juan Pablo Arango", "Sara Mejía"];
await gente[0]!("palabra", { nombreVisible: nombres[0] });
await gente[1]!("palabra", { nombreVisible: nombres[1] });
await gente[2]!("mociones", { nombreVisible: nombres[2], tipo: "ORDEN" });
const pregunta = await mesa<{ id: string }>(`sesiones/${sesion.id}/preguntas`, {
  texto:
    "¿Aprueba la asamblea el pliego de exigencias de bienestar para presentarlo al Consejo Superior?",
});
await mesa(`preguntas/${pregunta.id}/abrir`);
for (const page of celulares) await page.getByRole("tab", { name: /Votar/ }).click();
for (const page of celulares)
  await page.getByRole("heading", { name: /¿Aprueba la asamblea/ }).waitFor({ timeout: 25_000 });
await fotoCelular("celular-votar");
for (const page of celulares.slice(0, 2))
  await page.getByRole("radio", { name: "Sí" }).check({ force: true });
await foto(celulares[0]!, "celular-opcion-elegida", vistasCelular[0]!);
await foto(celulares[1]!, "celular-opcion-elegida", vistasCelular[1]!);
for (const [i, page] of celulares.entries()) {
  if (i === 2) await page.getByRole("radio", { name: "No" }).check({ force: true });
  await page.getByRole("button", { name: "Votar" }).click();
  await page.getByRole("heading", { name: "Tu voto quedó registrado" }).waitFor();
}
await fotoCelular("celular-confirmado");

// Votos de relleno: 9 personas
const ops = (await estado()).pregunta!.opciones;
for (const [i, voto] of gente.entries()) {
  const opcion = ops[i % 4 === 3 ? 1 : 0]!.id;
  await voto("votos", { preguntaId: pregunta.id, opcionId: opcion });
}
for (const page of proyecciones)
  await page
    .getByRole("heading", { name: /¿Aprueba la asamblea/ })
    .first()
    .waitFor({ timeout: 25_000 });
await proyecciones[0]!.waitForTimeout(3500);
await fotoProyeccion("proyeccion-votacion");

// El primer celular pide la palabra y presenta una moción
for (const [i, page] of celulares.entries()) {
  await page.getByRole("tab", { name: /Palabra/ }).click();
  if (i === 0) {
    await page.getByLabel("Cómo quieres que te anuncien").fill("Valentina Ríos");
    await page.getByRole("button", { name: "Pedir la palabra" }).click();
    await page.getByText(/Vas en el lugar/).waitFor({ timeout: 25_000 });
  }
}
await foto(celulares[0]!, "celular-en-fila", vistasCelular[0]!);
{
  const page = celulares[1]!;
  await page.getByLabel("Cómo quieres que te anuncien").fill("Laura Henao");
  await page.getByRole("button", { name: "Presentar una moción" }).click();
  await page.getByRole("radio", { name: /De aclaración/ }).check({ force: true });
  await page.getByRole("button", { name: "Presentar moción" }).click();
  await page.getByText("Tu moción está en la fila").waitFor({ timeout: 25_000 });
  await foto(page, "celular-mocion-en-fila", vistasCelular[1]!);
}

// 4. Mesa con la votación abierta y la fila
const vistasMesa = [
  v(1440, 900, "claro"),
  v(1440, 900, "oscuro"),
  v(360, 780, "claro"),
  v(360, 780, "oscuro"),
];
const paginasMesa: Page[] = [];
for (const vista of vistasMesa) {
  const page = await (await contexto(vista, sesionDeMesa)).newPage();
  await page.goto("/mesa");
  paginasMesa.push(page);
}
await paginasMesa[0]!
  .getByRole("link", { name: /Asamblea General/ })
  .first()
  .waitFor();
await foto(paginasMesa[0]!, "mesa-sesiones", vistasMesa[0]!);
await foto(paginasMesa[2]!, "mesa-sesiones", vistasMesa[2]!);
for (const page of paginasMesa) {
  await page.goto(`/mesa/sesiones/${sesion.id}`);
  await page.getByText("votaron").waitFor({ state: "attached", timeout: 25_000 });
  await page.waitForTimeout(3500);
}
for (const [i, page] of paginasMesa.entries()) {
  const vista = vistasMesa[i]!;
  await foto(page, "mesa-sesion", vista, true);
  if (vista.ancho === 360) {
    await page.getByRole("tab", { name: "Sala" }).click();
    await foto(page, "mesa-sala", vista, true);
    await page.getByRole("tab", { name: /Fila/ }).click();
  }
}
for (const [i, page] of paginasMesa.entries()) {
  if (i === 1 || i === 3) continue;
  const vista = vistasMesa[i]!;
  await page.goto(`/mesa/sesiones/${sesion.id}/codigos`);
  await page.getByLabel(/Cantidad de códigos/).fill("40");
  await page.getByRole("button", { name: "Generar" }).click();
  await page.getByText("Estos códigos se muestran una sola vez.").waitFor();
  await foto(page, "mesa-codigos", vista);
  await page.goto(`/mesa/sesiones/${sesion.id}/entregar`);
  await page.getByRole("button", { name: "Mostrar el primer código" }).click();
  await page.getByText("Entregados en esta pantalla: 1").waitFor();
  await foto(page, "mesa-entregar", vista);
}

// 5. Cierre, resultado y palabra en la proyección
await mesa(`preguntas/${pregunta.id}/cerrar`);
await mesa(`preguntas/${pregunta.id}/proyectar`);
for (const page of proyecciones)
  await page
    .getByText(/votos emitidos/)
    .first()
    .waitFor({ timeout: 25_000 });
await proyecciones[0]!.waitForTimeout(3500);
await fotoProyeccion("proyeccion-resultados");
const fila = (await estado()).palabra.fila;
const primera = fila.find((s) => s.nombre === "Valentina Ríos") ?? fila[0]!;
await mesa(`sesiones/${sesion.id}/palabra/dar`, { solicitudId: primera.id });
for (const page of proyecciones)
  await page.getByText(primera.nombre).first().waitFor({ timeout: 25_000 });
await proyecciones[0]!.waitForTimeout(3500);
await fotoProyeccion("proyeccion-palabra");
for (const page of celulares.slice(0, 1))
  await page.getByText("Tienes la palabra").waitFor({ timeout: 25_000 });
await foto(celulares[0]!, "celular-con-la-palabra", vistasCelular[0]!);

// 6. Administración y calendario
{
  const vista = v(1280, 900, "claro");
  const ctx = await contexto(vista, sesionDeMesa);
  const page = await ctx.newPage();
  await page.goto("/mesa/institucion");
  await page.getByLabel("Nombre de la institución").waitFor();
  await foto(page, "admin-institucion", vista, true);
  await page.goto("/mesa/personal");
  await page.getByRole("heading", { name: "Cuentas del personal" }).waitFor();
  await foto(page, "admin-personal", vista, true);
  await page.goto("/mesa");
  await page.getByLabel("Título").fill("Asamblea extraordinaria");
  await page.getByLabel("Fecha").fill(dia(2));
  await page.getByLabel("Desde").fill("10:30");
  await page.getByLabel("Hasta").fill("12:30");
  await page.getByText("Se cruza con:").waitFor();
  await foto(page, "mesa-programar-con-cruces", vista, true);
  await ctx.close();
}
for (const vista of [v(1280, 900, "claro"), v(1280, 900, "oscuro"), v(360, 780, "claro")]) {
  const ctx = await contexto(vista);
  const page = await ctx.newPage();
  await page.goto("/calendario");
  await foto(page, "calendario-mes", vista, true);
  await page.goto("/calendario?vista=lista");
  await foto(page, "calendario-lista", vista, true);
  await ctx.close();
}

await navegador.close();
console.log(`Capturas en ${SALIDA}`);
