import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/.turbo/**", "**/generated/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Guion de capturas y pruebas e2e: datos sembrados por el propio guion, la aserción es segura.
    files: ["apps/web/scripts/capturas.ts", "apps/web/e2e/**/*.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
);
