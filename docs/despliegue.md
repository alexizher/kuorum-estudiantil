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
3. `crear-proyecto`: crea el proyecto. Si en tu cuenta ya existe uno con ese nombre, pregunta antes de reutilizarlo.
4. `enlazar-proyecto`: enlaza esta carpeta al proyecto con `vercel link`.
5. `directorio-raiz`: fija `apps/web` como directorio raíz con el framework Next.js y activa el acceso a archivos fuera de ese directorio, que el build necesita.
6. `conectar-repositorio`: si el remoto `origin` es de GitHub (se compara el host, así que sirven HTTPS, SSH y alias como `github.com-personal`), conecta el repositorio.
7. `base-de-datos`: instala la integración de Neon con el nombre `<nombre-corto>-db` y plan gratuito en production, preview y development, y comprueba que production tenga `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. Si ya las tiene (por ejemplo, tras un corte a mitad del paso), no crea otra base. Al instalar Neon, la CLI de Vercel deja en la carpeta unas skills para agentes (`.agents/`, `.claude/` y `skills-lock.json`) y no tiene una bandera para evitarlo. El paso las borra al terminar, pero solo las que no existían antes, así que no toca un `.claude/` tuyo.
8. `variables`: carga `KUORUM_INSTITUCION_NOMBRE` en production y preview.
9. `secretos`: genera `KUORUM_SECRETO` y `BETTER_AUTH_SECRET` (32 bytes aleatorios en hexadecimal cada uno) en production y preview, solo si no existen. Los valores viajan por stdin y no se guardan en ningún archivo.
10. `despliegue`: corre `vercel deploy --prod --yes` y guarda la URL.
11. `verificacion`: pide `/api/salud` hasta recibir 200 (12 intentos, uno cada 5 segundos, por si Neon arranca en frío).
12. `administrador`: pregunta correo y nombre de la primera cuenta de la mesa, trae las variables de producción a un archivo temporal (permisos 0600), crea la cuenta con una contraseña generada, la muestra una sola vez y borra el archivo. Si la cuenta ya existe, lo avisa y sigue.
13. `resumen`: muestra la URL.

Los pasos 3 a 6 antes eran uno solo, `proyecto`. Un `.kuorum/despliegue.json` que lo tenga como completado se lee como si tuviera completados los cuatro.

El registro público está desactivado: las cuentas de la mesa solo se crean con este paso o con `pnpm --filter @kuorum/web crear-admin --correo <correo> --nombre <nombre>`, que lee la contraseña por stdin (mínimo 12 caracteres) o, con `--generar`, imprime una contraseña nueva una sola vez. El script necesita `DATABASE_URL` y `BETTER_AUTH_SECRET` en el entorno.

Cada cuenta tiene un rol. `--rol` acepta `SUPERADMIN` (el valor por defecto, y el que crea el asistente), `MESA` y `DEMO`. `SUPERADMIN` y `MESA` ven y operan todas las sesiones. `DEMO` es la cuenta de prueba pública y solo ve las que ella misma creó (ver la sección siguiente). Al actualizar una instalación que ya existía, la migración deja como `SUPERADMIN` a todas las cuentas que había y le asigna al primero de ellos las sesiones existentes.

## Publicar una versión nueva

En una instalación ya creada:

```
pnpm publicar
```

Corre `secretos`, `despliegue` y `verificacion`, sin mirar qué pasos se completaron antes. `secretos` solo agrega los que faltan, así que repetirlo no cambia nada. Hace falta haber corrido `pnpm desplegar` al menos una vez en ese directorio.

Si actualizas una instalación hecha antes de que existiera el ingreso de la mesa, el orden es este:

1. `pnpm publicar`: agrega los secretos nuevos y publica, y el build aplica las migraciones en producción.
2. `pnpm desplegar`: corre los pasos pendientes, como `administrador`, que necesita las tablas que dejó el paso anterior.

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

En tu máquina deja `.vercel/` (el enlace al proyecto) y `.kuorum/despliegue.json` (el avance del asistente, sin secretos). Ambos están en `.gitignore`. Si ya tenías `.agents/`, `.claude/` o `skills-lock.json` antes de correr el asistente, la CLI de Vercel pudo agregar ahí las skills de Neon: revisa `git status` antes de hacer commit.

## Cuenta de prueba (opcional)

Sirve para que cualquiera pruebe la mesa sin pedirte una cuenta. Las credenciales se muestran en la página de ingreso, así que son públicas por diseño. La cuenta de prueba no puede ver ni tocar las sesiones de las demás cuentas, y las suyas se borran cada día.

Variables de entorno (en Vercel, en production):

| Variable                 | Qué es                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `KUORUM_MODO_DEMO`       | `1` muestra el bloque "Cuenta de prueba" en `/mesa/ingresar`. Sin ella, o con otro valor, no aparece nada.                                   |
| `KUORUM_DEMO_CORREO`     | Correo de la cuenta de prueba.                                                                                                               |
| `KUORUM_DEMO_CONTRASENA` | Su contraseña, de 12 caracteres o más. Se lee en el servidor al pedir la página; no va en el código del navegador.                           |
| `CRON_SECRET`            | Secreto de la limpieza diaria. Genera uno con `openssl rand -base64 32`. Vercel lo manda como `Authorization: Bearer <CRON_SECRET>` al cron. |

Las variables solo muestran la cuenta. Para que exista hay que crearla una vez, con el mismo correo y la misma contraseña. Con `DATABASE_URL` y `BETTER_AUTH_SECRET` de producción en el entorno (por ejemplo con `vercel env pull` a un archivo temporal que luego borras):

```
printf '%s' "$KUORUM_DEMO_CONTRASENA" | pnpm --filter @kuorum/web crear-admin --correo "$KUORUM_DEMO_CORREO" --nombre "Cuenta de prueba" --rol DEMO
```

Qué puede hacer: crear sesiones, preguntas y códigos, abrir y cerrar votaciones y dar la palabra, todo dentro de las sesiones que creó. Los participantes entran a esas salas como a cualquier otra.

Qué no puede:

- Ver, abrir ni modificar sesiones de otras cuentas. Si pide una por su dirección, recibe un 404, igual que si no existiera.
- Tener más de 5 sesiones sin terminar a la vez. Al intentar la sexta recibe "La cuenta de prueba puede tener hasta 5 sesiones activas. Termina una para crear otra."
- Tener más de 20 sesiones en total en el día, terminadas o no, ni más de 20 preguntas en una sesión. Los topes vuelven a cero con la limpieza diaria. Al llegar a ellos recibe un aviso en español.
- Generar más de 50 códigos por petición ni más de 200 por sesión.
- Cambiar su contraseña, su correo ni su nombre, ni cerrar las sesiones abiertas de otras personas que usan la misma cuenta.

La limpieza es la ruta `GET /api/tareas/limpiar-demo`. Responde 401 sin el `CRON_SECRET` correcto (y siempre que la variable no esté definida). `apps/web/vercel.json` la programa con `"17 8 * * *"`, las 08:17 UTC, que son las 03:17 en Bogotá. En el plan Hobby Vercel puede ejecutarla en cualquier momento de esa hora. Borra, en una sola transacción, todas las sesiones creadas por cuentas `DEMO` con sus preguntas, conteos, votos emitidos, códigos, participantes y solicitudes de palabra. No toca nada de las cuentas `SUPERADMIN` ni `MESA`.

En la lista de la mesa, `SUPERADMIN` y `MESA` no ven las sesiones de la cuenta de prueba, para que los ensayos públicos no las tapen. `SUPERADMIN` tiene un interruptor "Mostrar sesiones de la cuenta de prueba"; `MESA` no. Las sesiones de la cuenta de prueba siguen abiertas por su dirección para ambos roles.

Para rotar la contraseña no borres la cuenta: al borrar el usuario sus sesiones quedan sin dueño y las ve solo la administración. Cámbiala en su lugar, con la misma forma de arriba y `--actualizar` (también cierra las sesiones abiertas de esa cuenta):

```
printf '%s' "$NUEVA_CONTRASENA" | pnpm --filter @kuorum/web crear-admin --correo "$KUORUM_DEMO_CORREO" --nombre "Cuenta de prueba" --rol DEMO --actualizar
```

Después actualiza `KUORUM_DEMO_CONTRASENA` en Vercel y publica de nuevo. `--actualizar` sirve igual para cualquier otra cuenta.

Como la contraseña es pública, cualquiera puede iniciar sesión con ella y crear salas visibles con su código. Si apagas la cuenta de prueba quitando `KUORUM_MODO_DEMO`, la cuenta sigue existiendo y la contraseña ya fue pública: cualquiera que la haya visto puede seguir entrando. Rota la contraseña con `--actualizar` (y no la publiques) o borra el usuario antes de apagarla.

## Después del primer despliegue

Entra a `/mesa` con la cuenta de administración y abre **Institución**: pon el nombre de la institución, cómo se llaman sus cuerpos y la zona horaria (viene en `America/Bogota`), y agrega las facultades. Luego, en **Personal**, crea las cuentas de quienes llevan cada asamblea. Los detalles están en la [guía del administrador](uso/administrador.md).

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

La pantalla pública consulta el estado de la sesión cada 3 s mientras hay una votación abierta o la persona está en la fila de palabra, y cada 12 s en el resto del tiempo, salvo los primeros 30 s después de entrar, que van a 3 s. En pausa si la pestaña está oculta. El límite que se alcanza primero es el de peticiones de CDN de Vercel Hobby (unos 1M al mes). Las mediciones y el cálculo están en [ADR 0001](adr/0001-transporte-de-tiempo-real.md).

- Sin dominio propio: unas 830 persona-hora al mes si todos consultan cada 3 s, o unas 2.000 con el intervalo adaptativo. Una persona conectada una hora son 1.200 peticiones a 3 s y 300 a 12 s.
- Con dominio propio y Cloudflare gratuito delante: las consultas las responde Cloudflare y Vercel recibe unas 0,5 peticiones por segundo por sesión abierta. Una general de 3.000 personas durante 3 horas cabe.
- Si superas la cuota, Vercel pausa el despliegue hasta el mes siguiente.

El calendario público (`/api/public/v1/calendario` y su `.ics`) se cachea 60 s en el borde. Los clientes de calendario suscritos lo piden cada pocas horas, así que su costo en peticiones es pequeño frente al de una sala abierta.

Pon Cloudflare delante en cuanto planees asambleas generales de más de unas 300 personas, o varias sesiones grandes en el mismo mes.

## Límites de tasa

- Votos: tope de 1.000 por minuto por participante (la identidad de la cookie firmada), solo contra inundaciones. Nunca se limitan por IP: un auditorio entero comparte la misma.
- Ingreso a la sala: tope por IP. Por defecto la IP sale del primer valor de `x-forwarded-for` o de `x-real-ip`. Con `KUORUM_DETRAS_DE_CLOUDFLARE=1` se lee `cf-connecting-ip`, para que con Cloudflare delante los usuarios no queden en un solo cupo. No pongas esa variable si Cloudflare no está delante: Vercel deja pasar cabeceras ajenas y un cliente podría inventar `cf-connecting-ip` para esquivar el tope. Con la variable activa, Vercel debe ser alcanzable solo a través de Cloudflare.
- Los contadores viven en la memoria de cada instancia: se pierden al reiniciar y no se comparten entre instancias.

## Dominio propio con Cloudflare (recomendado para asambleas grandes)

Cloudflare solo puede ponerse delante de un dominio propio, no de un `*.vercel.app`. Con un dominio (unos 10 USD al año) y el plan gratuito de Cloudflare, las consultas de estado las responde Cloudflare y la cuota de Vercel alcanza para sesiones de miles de personas. Los pasos son: comprar el dominio, pasarlo a Cloudflare, conectarlo al proyecto en Vercel y dejar que Cloudflare guarde en caché las consultas de estado público. Sin dominio, la cuota gratuita limita el tamaño de la sesión (ver "Capacidad del plan gratuito").

Cuando Cloudflare esté delante, agrega `KUORUM_DETRAS_DE_CLOUDFLARE=1` a las variables de producción y publica de nuevo, para que el tope de ingreso use la IP real (`cf-connecting-ip`). Solo hazlo si Vercel es alcanzable únicamente a través de Cloudflare; si no, esa cabecera se puede falsificar.
