# Cómo contribuir

1. Abre un issue antes de un cambio grande.
2. Trabaja en una rama a partir de `main` y abre un pull request.
3. Antes de enviar, corre `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm depcheck` y `pnpm test`. El CI corre los mismos comandos.

## Desarrollo local

Necesitas Node 24 (está en `.nvmrc`), pnpm 11 (la versión exacta está en `packageManager` de `package.json`; `corepack enable` la instala) y Podman o Docker con compose.

### Desde un clon limpio

```sh
git clone https://github.com/alexizher/kuorum-estudiantil.git
cd kuorum-estudiantil
pnpm install
podman compose up -d        # o docker compose up -d
pnpm test
```

`podman compose up -d` levanta Postgres 17 en el puerto 54329 con usuario, contraseña y base `kuorum`. `pnpm test` genera el cliente de Prisma y compila los paquetes antes de correr las pruebas, así que no hace falta nada más.

### Variables de entorno

Copia `.env.example` a `.env` y completa los dos secretos:

```sh
cp .env.example .env
openssl rand -base64 32     # pega el resultado en KUORUM_SECRETO
openssl rand -base64 32     # y otro en BETTER_AUTH_SECRET
```

Ni Prisma ni los guiones leen `.env` por su cuenta. Expórtalo en la terminal donde vas a trabajar:

```sh
set -a; source .env; set +a
```

Todos los comandos de abajo suponen esas variables exportadas.

### Pruebas de integración

```sh
pnpm --filter @kuorum/infrastructure db:deploy
pnpm test:int
```

`db:deploy` aplica las migraciones y necesita `DATABASE_URL` (o `DATABASE_URL_UNPOOLED`). `pnpm test:int` solo acepta URLs locales porque borra los datos de la base. Sin `DATABASE_URL` usa `postgresql://kuorum:kuorum@localhost:54329/kuorum`.

### La app web contra el Postgres local

```sh
pnpm --filter @kuorum/infrastructure db:deploy
pnpm turbo run build --filter=@kuorum/web^...
pnpm --filter @kuorum/web dev
```

La segunda línea compila los paquetes de los que depende la web (`domain`, `application`, `infrastructure` y los demás), que se importan desde su `dist`. Si ya corriste `pnpm test` o `pnpm build`, están compilados. La app queda en http://localhost:3000 y `/api/salud` responde `{"estado":"ok","baseDeDatos":"ok"}` cuando llega a la base.

Next.js lee las variables exportadas en la terminal. Si prefieres no exportarlas, copia `.env` a `apps/web/.env.local`, que Next carga solo (el resto de comandos sigue necesitando la exportación).

Para entrar a la mesa crea una cuenta. El guion lee la contraseña de stdin (mínimo 12 caracteres) o la genera con `--generar`:

```sh
pnpm --filter @kuorum/web crear-admin --correo tu@correo.test --nombre "Tu nombre" --generar
```

Después ingresa en http://localhost:3000/mesa/ingresar. Como `pnpm test:int` vacía la base, después de correrlo tienes que crear la cuenta otra vez.

### Problemas comunes

- **Aviso `Unsupported engine` en `pnpm install`**: `apps/web` pide Node `24.x` porque es la versión de Vercel. Con Node 26 la instalación y las pruebas funcionan; el aviso se puede ignorar o se quita con `nvm use`.
- **`prisma migrate` dice que no hay URL de la base**: falta exportar `.env` en esa terminal (ver arriba).
- **El puerto 54329 está ocupado**: cambia el puerto publicado con `KUORUM_PUERTO_POSTGRES=54330 podman compose up -d` y usa ese puerto en `DATABASE_URL`.
- **Dos clones en la misma máquina**: compose nombra el proyecto con la carpeta, así que dos clones llamados `kuorum-estudiantil` comparten el mismo contenedor. Para un Postgres aparte usa otro nombre de proyecto y otro puerto: `KUORUM_PUERTO_POSTGRES=54330 podman compose -p kuorum-otro up -d`.
- **Better Auth avisa `Base URL is not set`**: en local es normal, deduce la dirección de cada petición. Deja `BETTER_AUTH_URL` vacía.

## Convenciones

- Commits en Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), en español.
- Los nombres del dominio van en español (`Sesion`, `CodigoDeSala`). El resto del código va en inglés. Los textos de interfaz y de la CLI van en español.
- TypeScript estricto. Las clases reciben sus dependencias por constructor.
- Regla de dependencias: `domain` no importa nada externo, `application` solo importa `domain`, y nadie importa `apps/web` ni `packages/cli`.
- No subas secretos ni archivos `.env`.

Al contribuir aceptas que tu aporte se publique bajo la licencia MIT del proyecto.
