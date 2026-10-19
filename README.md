# Kuorum Estudiantil

Aplicación de código abierto (MIT) para asambleas estudiantiles: sesiones con quórum, votaciones y actas, pensada para desplegarse en Vercel.

Estado: en construcción. La fase 0 sienta la base del monorepo y la capacidad del sistema.

La documentación está en [`docs/`](docs/).

## Requisitos

- Node 22 o superior (se recomienda 24, ver `.nvmrc`)
- pnpm 11

## Comandos

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Estructura

- `packages/domain`: reglas del dominio, sin dependencias externas.
- Los demás paquetes y `apps/web` se agregan en las siguientes tareas.

Para contribuir, lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE)
