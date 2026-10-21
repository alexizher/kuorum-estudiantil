import { defineConfig, devices } from "@playwright/test";

// Valores de prueba: solo sirven contra la base local o la del servicio de CI.
const puerto = Number(process.env["E2E_PUERTO"] ?? 3150);
const entorno = {
  DATABASE_URL: process.env["DATABASE_URL"] ?? "postgresql://kuorum:kuorum@localhost:54329/kuorum",
  BETTER_AUTH_SECRET: process.env["BETTER_AUTH_SECRET"] ?? "secreto-de-prueba-e2e-0123456789abcdef",
  KUORUM_SECRETO: process.env["KUORUM_SECRETO"] ?? "secreto-de-prueba-e2e-fedcba9876543210",
  BETTER_AUTH_URL: `http://localhost:${puerto}`,
  // La cuenta de prueba que muestra el ingreso. Es solo el texto de la pantalla: la cuenta con la
  // que las pruebas entran como DEMO la crea e2e/preparar.ts con otro correo.
  KUORUM_MODO_DEMO: "1",
  KUORUM_DEMO_CORREO: "prueba-publica@example.test",
  KUORUM_DEMO_CONTRASENA: "contrasena-publica-de-e2e",
};
Object.assign(process.env, entorno);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/preparar.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${puerto}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm turbo run build --filter=@kuorum/web && pnpm --filter @kuorum/web exec next start -p ${puerto}`,
    cwd: "../..",
    url: `http://localhost:${puerto}/api/salud`,
    timeout: 600_000,
    reuseExistingServer: !process.env["CI"],
    env: entorno,
  },
});
