# Cómo contribuir

1. Abre un issue antes de un cambio grande.
2. Trabaja en una rama a partir de `main` y abre un pull request.
3. Antes de enviar, corre `pnpm lint`, `pnpm typecheck` y `pnpm test`. El CI corre los mismos comandos.

## Convenciones

- Commits en Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), en español.
- Los nombres del dominio van en español (`Sesion`, `InstantaneaDeSesion`). El resto del código va en inglés. Los textos de interfaz y de la CLI van en español.
- TypeScript estricto. Las clases reciben sus dependencias por constructor.
- Regla de dependencias: `domain` no importa nada externo, `application` solo importa `domain`, y nadie importa `apps/web` ni `packages/cli`.
- No subas secretos ni archivos `.env`.

Al contribuir aceptas que tu aporte se publique bajo la licencia MIT del proyecto.
