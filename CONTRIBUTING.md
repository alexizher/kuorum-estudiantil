# Cómo contribuir

1. Abre un issue antes de un cambio grande.
2. Trabaja en una rama a partir de `main` y abre un pull request.
3. Antes de enviar, corre `pnpm lint`, `pnpm typecheck` y `pnpm test`. El CI corre los mismos comandos.

## Pruebas de integración

Necesitan un Postgres local (solo se aceptan URLs locales, porque borran datos):

```
podman compose up -d
pnpm --filter @kuorum/infrastructure db:deploy
pnpm test:int
```

`pnpm test:int` genera el cliente de Prisma y compila los paquetes antes de correr las pruebas, así que sirve en un clon limpio. La URL por defecto es `postgresql://kuorum:kuorum@localhost:54329/kuorum`; se cambia con `DATABASE_URL`.

## Convenciones

- Commits en Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), en español.
- Los nombres del dominio van en español (`Sesion`, `CodigoDeSala`). El resto del código va en inglés. Los textos de interfaz y de la CLI van en español.
- TypeScript estricto. Las clases reciben sus dependencias por constructor.
- Regla de dependencias: `domain` no importa nada externo, `application` solo importa `domain`, y nadie importa `apps/web` ni `packages/cli`.
- No subas secretos ni archivos `.env`.

Al contribuir aceptas que tu aporte se publique bajo la licencia MIT del proyecto.
