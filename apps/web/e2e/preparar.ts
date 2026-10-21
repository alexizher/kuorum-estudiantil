import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { entrarALaMesa } from "./ayudas";

export const SESION_DE_MESA = "test-results/mesa.json";
export const SESION_DE_DEMO = "test-results/demo.json";

// Migra la base y crea una cuenta de mesa solo para esta corrida.
export default async function preparar(): Promise<void> {
  const raiz = new URL("../../..", import.meta.url).pathname;
  execFileSync("pnpm", ["--filter", "@kuorum/infrastructure", "db:deploy"], {
    cwd: raiz,
    stdio: "inherit",
  });
  const correo = `e2e-${randomUUID().slice(0, 8)}@example.test`;
  const contrasena = execFileSync(
    "pnpm",
    [
      "--filter",
      "@kuorum/web",
      "--silent",
      "crear-admin",
      "--correo",
      correo,
      "--nombre",
      "Mesa de pruebas",
      "--generar",
    ],
    { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  ).trim();
  process.env["E2E_CORREO"] = correo;
  process.env["E2E_CONTRASENA"] = contrasena;

  // La cuenta de prueba (rol DEMO), con la contraseña por stdin como en una instalación real.
  const correoDemo = `demo-${randomUUID().slice(0, 8)}@example.test`;
  const contrasenaDemo = `demo-${randomUUID()}`;
  execFileSync(
    "pnpm",
    [
      "--filter",
      "@kuorum/web",
      "--silent",
      "crear-admin",
      "--correo",
      correoDemo,
      "--nombre",
      "Cuenta de prueba",
      "--rol",
      "DEMO",
    ],
    { cwd: raiz, input: contrasenaDemo, stdio: ["pipe", "inherit", "inherit"] },
  );

  // Una sola entrada para toda la corrida: el ingreso está limitado a 5 intentos por minuto.
  mkdirSync("test-results", { recursive: true });
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({
    baseURL: `http://localhost:${process.env["E2E_PUERTO"] ?? 3150}`,
  });
  await entrarALaMesa(await ctx.newPage());
  await ctx.storageState({ path: SESION_DE_MESA });
  const ctxDemo = await navegador.newContext({
    baseURL: `http://localhost:${process.env["E2E_PUERTO"] ?? 3150}`,
  });
  await entrarALaMesa(await ctxDemo.newPage(), correoDemo, contrasenaDemo);
  await ctxDemo.storageState({ path: SESION_DE_DEMO });
  await navegador.close();
}
