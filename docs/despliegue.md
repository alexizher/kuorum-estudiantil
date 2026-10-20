# Despliegue

Esta guía instala Kuorum Estudiantil en una cuenta propia de Vercel con una base de datos Neon. Todo cabe en los planes gratuitos.

## Requisitos

- Node 22 o superior en tu máquina, pnpm y git. En Vercel el proyecto corre con Node 24 (lo fija `apps/web/package.json`).
- Una cuenta de Vercel (plan Hobby alcanza) y acceso al marketplace de integraciones.
- La CLI de Vercel. Si falta, el asistente ofrece instalarla con `pnpm add -g vercel@64`.
- Una copia del repositorio en tu máquina, con `pnpm install` ya corrido.

## Desplegar con el asistente

Desde la raíz del repositorio:

```
pnpm desplegar
```

Antes de cada paso que crea algo en tu cuenta, el asistente dice qué va a crear y con qué nombre. El asistente pregunta el nombre de la institución y un nombre corto (minúsculas, números y guiones, de 3 a 40 caracteres). Luego corre estos pasos en orden:

1. `requisitos`: revisa node, pnpm, git y vercel.
2. `sesion-vercel`: comprueba la sesión con `vercel whoami` y abre `vercel login` si hace falta.
3. `proyecto`: crea el proyecto, lo enlaza y fija `apps/web` como directorio raíz con el framework Next.js (y activa el acceso a archivos fuera de ese directorio, que el build necesita). Si en tu cuenta ya existe un proyecto con ese nombre, pregunta antes de reutilizarlo. Si el remoto `origin` es de GitHub, conecta el repositorio.
4. `base-de-datos`: instala la integración de Neon con el nombre `<nombre-corto>-db` y plan gratuito en production, preview y development, y comprueba que production tenga `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. Si ya las tiene (por ejemplo, tras un corte a mitad del paso), no crea otra base.
5. `variables`: carga `KUORUM_INSTITUCION_NOMBRE` en production y preview.
6. `secretos`: genera `KUORUM_SECRETO` y `BETTER_AUTH_SECRET` (32 bytes aleatorios en hexadecimal cada uno) en production y preview, solo si no existen. Los valores viajan por stdin y no se guardan en ningún archivo.
7. `despliegue`: corre `vercel deploy --prod --yes` y guarda la URL.
8. `verificacion`: pide `/api/salud` hasta recibir 200 (12 intentos, uno cada 5 segundos, por si Neon arranca en frío).
9. `administrador`: pregunta correo y nombre de la primera cuenta de la mesa, trae las variables de producción a un archivo temporal (permisos 0600), crea la cuenta con una contraseña generada, la muestra una sola vez y borra el archivo. Si la cuenta ya existe, lo avisa y sigue.
10. `resumen`: muestra la URL.

El registro público está desactivado: las cuentas de la mesa solo se crean con este paso o con `pnpm --filter @kuorum/web crear-admin --correo <correo> --nombre <nombre>`, que lee la contraseña por stdin (mínimo 12 caracteres) o, con `--generar`, imprime una contraseña nueva una sola vez. El script necesita `DATABASE_URL` y `BETTER_AUTH_SECRET` en el entorno.

## Publicar una versión nueva

En una instalación ya creada:

```
pnpm publicar
```

Corre solo `despliegue` y `verificacion`, sin mirar qué pasos se completaron antes. Hace falta haber corrido `pnpm desplegar` al menos una vez en ese directorio. Si actualizas una instalación hecha antes de que existiera el ingreso de la mesa, corre `pnpm desplegar` (solo ejecuta los pasos nuevos, `secretos` y `administrador`) y después `pnpm publicar` para que el sitio tome los secretos.

Para fijar el directorio raíz el asistente llama a la API de Vercel y necesita un token. Lo toma de la variable `VERCEL_TOKEN` o, si no existe, del archivo de sesión de la CLI (en Linux, `~/.local/share/com.vercel.cli/auth.json`). El token no se imprime ni se guarda.

Si la CLI no puede crear la base de Neon sin intervención, el asistente muestra la página de la integración (https://vercel.com/marketplace/neon), pide que la crees a mano con el nombre indicado y sigue cuando confirmas.

La primera vez que una cuenta de Vercel instala Neon, hay que aceptar los términos de Neon. El asistente detecta ese caso, muestra el enlace de aceptación y los enlaces de políticas, y espera tu confirmación para reintentar. Es una sola vez por cuenta. En modo no interactivo falla con ese enlace: acepta los términos y vuelve a correr `pnpm desplegar`, que retoma desde el paso pendiente.

Si `vercel git connect` falla con "You need to add a Login Connection to your GitHub account first", el asistente lo deja como aviso y sigue. Para tener despliegues por push, conecta GitHub en Vercel (Account Settings > Authentication > Login Connections) y vuelve a conectar el repositorio desde el panel del proyecto. Sin esa conexión, los despliegues siguen funcionando con `pnpm desplegar`.

En modo no interactivo, cualquier acción manual (instalar la CLI de Vercel, crear la base a mano, reutilizar un proyecto existente) termina con un error que explica qué hacer, en vez de quedarse esperando una respuesta.

## Modo no interactivo

```
pnpm desplegar -- --config configuracion.json
```

El JSON lleva los dos campos y no se pregunta nada. Si agregas `adminEmail` y `adminName`, el paso `administrador` crea la cuenta de la mesa; sin ellos, ese paso se omite con un aviso y queda pendiente. Como nadie puede confirmar, si ya existe un proyecto con ese nombre el asistente falla, salvo que agregues `"reuseExistingProject": true`. Si ya hay avance guardado y el JSON dice otra cosa, también falla: borra `.kuorum/despliegue.json` para empezar con la nueva configuración.

```json
{ "institutionName": "Universidad del Ejemplo", "shortName": "ejemplo" }
```

Si falta un campo o es inválido, el asistente dice cuál y termina con código 1 sin tocar la cuenta.

## Qué crea en tu cuenta

- Un proyecto de Vercel con el nombre corto.
- Un recurso de Neon `<nombre-corto>-db`, conectado al proyecto.
- Las variables de entorno de la base de datos (las pone la integración) y `KUORUM_INSTITUCION_NOMBRE`.
- Un despliegue de producción en `https://<proyecto>.vercel.app`.

El archivo `.vercelignore` deja fuera del despliegue `.env*`, `.kuorum`, `node_modules` y los artefactos de build. La integración se instala con `--no-env-pull`, así que las credenciales de la base no se escriben en tu copia local.

En tu máquina deja `.vercel/` (el enlace al proyecto) y `.kuorum/despliegue.json` (el avance del asistente, sin secretos). Ambos están en `.gitignore`.

## Migraciones de base de datos

El build de Vercel aplica las migraciones de Prisma solo cuando `VERCEL_ENV` es `production`. Las vistas previas (ramas y pull requests) nunca migran, así que un PR con una migración no toca la base de producción antes de fusionarse; su vista previa corre contra el esquema que ya tiene la base que le toque. El script es `scripts/migrar-si-produccion.mjs`.

## Reanudar

El asistente guarda cada paso terminado en `.kuorum/despliegue.json`. Si se corta o falla un paso, vuelve a correr `pnpm desplegar`: salta lo ya hecho y reintenta desde el paso que falló, sin crear un segundo proyecto ni una segunda base. Si el archivo se daña, el asistente avisa y basta con borrarlo; el proyecto se reutiliza por nombre.

## Borrar lo creado

1. Quita el recurso de Neon: `vercel integration resource remove <nombre-corto>-db`, o desde el panel de Vercel en Storage.
2. Borra el proyecto: `vercel project remove <nombre-corto>`.
3. Borra `.vercel/` y `.kuorum/` de tu copia local.

## Límites del plan gratuito

Las cifras vigentes están en https://vercel.com/docs/limits y https://neon.com/docs/introduction/plans. Revísalas antes de planear una asamblea, porque cambian.

## Capacidad del plan gratuito

La pantalla pública consulta el estado de la sesión cada 3 s mientras hay una votación abierta o la persona está en la fila de palabra, y cada 12 s en el resto del tiempo. En pausa si la pestaña está oculta. El límite que se alcanza primero es el de peticiones de CDN de Vercel Hobby (unos 1M al mes). Las mediciones y el cálculo están en [ADR 0001](adr/0001-transporte-de-tiempo-real.md).

- Sin dominio propio: unas 830 persona-hora al mes si todos consultan cada 3 s, o unas 2.000 con el intervalo adaptativo. Una persona conectada una hora son 1.200 peticiones a 3 s y 300 a 12 s.
- Con dominio propio y Cloudflare gratuito delante: las consultas las responde Cloudflare y Vercel recibe unas 0,5 peticiones por segundo por sesión abierta. Una general de 3.000 personas durante 3 horas cabe.
- Si superas la cuota, Vercel pausa el despliegue hasta el mes siguiente.

Pon Cloudflare delante en cuanto planees asambleas generales de más de unas 300 personas, o varias sesiones grandes en el mismo mes.

## Dominio propio con Cloudflare (recomendado para asambleas grandes)

Cloudflare solo puede ponerse delante de un dominio propio, no de un `*.vercel.app`. Con un dominio (unos 10 USD al año) y el plan gratuito de Cloudflare, las consultas de estado las responde Cloudflare y la cuota de Vercel alcanza para sesiones de miles de personas. Los pasos son: comprar el dominio, pasarlo a Cloudflare, conectarlo al proyecto en Vercel y dejar que Cloudflare guarde en caché las consultas de estado público. Sin dominio, la cuota gratuita limita el tamaño de la sesión (ver "Capacidad del plan gratuito").
