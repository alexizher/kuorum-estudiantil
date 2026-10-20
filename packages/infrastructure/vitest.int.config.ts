import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/**/*.int.test.ts"], fileParallelism: false },
});
