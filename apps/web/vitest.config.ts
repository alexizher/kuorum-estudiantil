import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig usa jsx "preserve" por Next; para las pruebas se transforma en automático.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: ["test/**/*.int.test.ts"],
    // axe sobre formularios largos pasa de 5 s en los runners de CI.
    testTimeout: 20_000,
  },
});
