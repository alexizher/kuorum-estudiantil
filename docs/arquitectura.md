# Arquitectura

Monorepo de TypeScript con pnpm y Turborepo. El código se reparte en capas y una regla de CI (dependency-cruiser) impide que se mezclen.

## Capas

```
domain  <-  application  <-  infrastructure  <-  apps/web
                                                      |
contracts  <------------------------------------------+
```

`contracts` no importa ninguna otra capa; `apps/web` lo usa para validar lo que entra y sale por la API.

| Paquete                   | Responsabilidad                                                                                                                   | Puede importar                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `packages/domain`         | Reglas de la asamblea: sesión, preguntas, fila de intervenciones. TypeScript puro.                                                | Nada fuera de sí mismo        |
| `packages/application`    | Un caso de uso por clase (`EmitirVoto`, `DarLaPalabra`, `ConsultarEstadoDeSala`). Define los puertos (repositorios, reloj, hash). | `domain`                      |
| `packages/infrastructure` | Implementa los puertos: Postgres con Prisma 7 (adaptadores `pg` y Neon), hash SHA-256 de códigos, autenticación de la mesa.       | `domain`, `application`       |
| `packages/contracts`      | Esquemas zod de lo que entra y sale por la API.                                                                                   | Solo zod                      |
| `packages/ui`             | Tokens, tema claro y oscuro, componentes de presentación sin reglas de negocio.                                                   | React, `qrcode` y `contracts` |
| `apps/web`                | Next.js 16: rutas de la API, las vistas y la composición (`composicion.ts`), el único lugar donde se instancian las dependencias. | Todos los anteriores          |

Los nombres del dominio van en español (`Sesion`, `Pregunta`, `SolicitudDePalabra`), también en la aplicación, la infraestructura y la web. La infraestructura de herramientas (la CLI, los scripts) va en inglés. Los errores del dominio llevan un `codigo` estable (`YA_VOTO`, `CIERRE_OCUPADO`) y la API los traduce con `respuestaDeError`.

## Agregados

- **Institucion y Cuerpo.** Una instalación es una institución, con su nombre, el nombre de sus cuerpos y su zona horaria. Los cuerpos son la asamblea general (una sola, la crea la migración) y las facultades. Un cuerpo archivado no recibe sesiones nuevas.
- **Sesion.** Una asamblea de un cuerpo, con inicio, fin, modalidad y lugar. Se puede reprogramar o cancelar mientras está `PROGRAMADA`. Tiene su código de sala, su modo (`CON_CODIGOS` o `SALA_ABIERTA`), su estado (`PROGRAMADA`, `EN_CURSO`, `CERRADA`, entre otros) y una `version` que sube con cada cambio de la sala, dentro de la misma transacción. Esa versión es parte del ETag del estado público.
- **Pregunta.** Pertenece a una sesión, tiene sus opciones y pasa de `BORRADOR` a `ABIERTA` y `CERRADA`, o a `ANULADA`. El resultado se calcula al cerrar y la mesa decide cuándo proyectarlo.
- **Participante y código de acceso.** El código se genera una vez, se muestra una vez y se guarda solo como hash. Activarlo crea un participante anónimo, que es lo que cuenta como un voto.
- **Cola de intervenciones.** Solicitudes de palabra y mociones. Las mociones pasan adelante según su prioridad, y quien habla tiene un tiempo que la mesa puede ampliar.

- **Decision.** Se crea dentro de la misma transacción que cierra la votación, una por pregunta (índice único), y no se crea para las anuladas. Guarda una foto del resultado: totales por opción, votos emitidos, asistencia al cerrar y si la votación es indicativa. No se recalcula después, así que lo que se lee hoy es lo que se vio al cerrar. Guarda también la regla (`MAYORIA_SIMPLE`) para que una regla nueva no obligue a migrar datos. Solo el enunciado se puede editar, y solo hasta que el acta se finaliza.
- **Acta.** Pasa de borrador a final. Los campos fijos los arma el sistema (cuerpo, fecha, lugar, orden del día, asistencia como número, intervenciones, mociones y decisiones) y la mesa escribe el desarrollo. No guarda nombres. Al finalizar se congela la foto del contenido y se genera el código de verificación; después no admite cambios (`ACTA_FINALIZADA`, 409) y la sesión pasa a `ACTA_FINAL`.

## Decisiones y actas en PDF

El PDF no se almacena. Se genera bajo pedido con `pdf-lib` desde la foto guardada al finalizar, con Helvetica estándar (cubre tildes y eñe), y la respuesta se cachea un día en el borde (`s-maxage=86400`). Como el acta final no cambia, el PDF es siempre el mismo. No hay almacenamiento de archivos que mantener.

El código de verificación tiene 10 caracteres del alfabeto de los códigos de sala, en grupos `XXXXX-XXXXX`. Se guarda tal cual porque es público por diseño: sirve para que cualquiera compruebe un PDF, no para entrar a nada. Es único, y la verificación lo normaliza (mayúsculas, sin espacios, con o sin guion). El público ve decisiones y actas solo cuando la sesión está en `ACTA_FINAL`, y nunca las de la cuenta de prueba.

## Roles de la mesa y quién ve qué

Cada cuenta de la mesa tiene un tipo en `auth_users.rol`: `SUPERADMIN` (administra la instalación), `MESA` (personal) o `DEMO` (cuenta de prueba pública). Los permisos del personal salen de sus membresías (`membresias`: usuario, cuerpo y rol `ENCARGADO` o `MESA`). Las rutas de la mesa pasan por `exigirMesa`, que arma el `Actor` (id, tipo y membresías) y lo entrega a `accionDeMesa`. Las reglas viven en `packages/application/src/institucion/permisos.ts` y cada caso de uso las aplica, no la interfaz:

| Quién                               | Programar en un cuerpo | Conducir una sesión | Reprogramar o cancelar | Administrar |
| ----------------------------------- | ---------------------- | ------------------- | ---------------------- | ----------- |
| `SUPERADMIN`                        | En cualquiera activo   | Todas               | Todas                  | Sí          |
| `MESA` con `ENCARGADO` en el cuerpo | En ese cuerpo          | Las de ese cuerpo   | Las de ese cuerpo      | No          |
| `MESA` con `MESA` en el cuerpo      | No                     | Las de ese cuerpo   | No                     | No          |
| `DEMO`                              | En cualquiera activo   | Las suyas           | Las suyas              | No          |

El personal no toca lo que crea la cuenta de prueba, aunque sea de su cuerpo. Un cuerpo archivado no recibe sesiones nuevas de nadie.

Cuando un actor no puede conducir una sesión, el caso de uso lanza `SESION_AJENA`, y `respuestaDeError` la publica como 404 `SESION_NO_ENCONTRADA`, con el mismo cuerpo que una sesión inexistente. Las preguntas ajenas responden `PREGUNTA_NO_ENCONTRADA` y un cuerpo donde no se puede programar responde 404 `CUERPO_AJENO`, por la misma razón. Las rutas públicas (sala, proyección, celular, calendario) no usan actor.

Las cuentas `MESA` que existían antes de las membresías quedaron como encargadas de la asamblea general, que es adonde pasaron todas las sesiones existentes.

## Horas y cruces

Las horas se guardan en UTC. La mesa las escribe en hora local de la institución (`2026-11-03T14:00`) y `deHoraLocal` las convierte con la zona configurada, sin depender de la zona del navegador ni del servidor. Dos sesiones se cruzan si sus intervalos se tocan por dentro: una que termina a las 14:00 no choca con otra que empieza a esa hora. Los cruces se buscan en toda la institución, sin canceladas ni sesiones de la cuenta de prueba, y solo se avisan.

La cuenta `DEMO` además tiene topes (5 sesiones sin terminar, 50 códigos por petición y 200 por sesión) que aplican `CrearSesion` y `GenerarCodigosDeAcceso`, y la tarea diaria `LimpiarSesionesDeDemo` borra lo que creó. El rol se guarda en `auth_users.rol`; Better Auth lo declara con `input: false`, así que ningún cliente puede escribirlo, y un hook bloquea a `DEMO` en las rutas de cambio de contraseña, correo y datos.

## Cómo se guarda el voto secreto

Toda pregunta es secreta. El voto se reparte en dos tablas que no se pueden unir:

- `votos_emitidos(preguntaId, participanteId)`: quién ya votó. Sin hora y sin opción. La clave primaria impide votar dos veces.
- `conteos(preguntaId, opcionId, total)`: cuántos votos tiene cada opción, una fila por opción.

Un voto es una sola sentencia SQL: toma `FOR SHARE` sobre la pregunta, comprueba que esté abierta y que la opción sea suya, bloquea las filas de conteo de la pregunta en orden de opción, inserta en `votos_emitidos` y actualiza todas las filas de conteo con `total + (opcion = elegida)::int`. Cerrar una pregunta toma `FOR UPDATE`: espera a los votos en vuelo y los que llegan después ven la pregunta cerrada. Si una ráfaga de votos no lo deja entrar, el cierre hace 3 intentos de 5 s de espera cada uno y luego responde `CIERRE_OCUPADO`.

### Qué queda protegido en reposo

- Ninguna fila ni columna une un participante con una opción. Tampoco hay hora por voto.
- Postgres guarda en cada fila el identificador de la transacción que la escribió (`xmin`). Como cada voto actualiza todas las opciones, las filas vivas de `conteos` de una pregunta comparten el `xmin` del último votante, sea cual sea su opción. Unir `votos_emitidos` con `conteos` por `xmin` no asigna una opción a un votante, salvo cuando la pregunta tiene un solo voto en total (un conteo de uno lo revela por sí mismo).
- Los códigos de acceso se guardan solo como hash SHA-256.

### Riesgos residuales

Todos requieren acceso a la base de datos:

- Versiones anteriores de las filas (tuplas muertas) y el WAL conservan los `xmin` de votos pasados hasta que corre el vacuum y se rota el WAL. Con eso se podría deducir qué opción subió en cada transacción.
- Quien pueda leer la base en tiempo real puede consultar los contadores entre un voto y el siguiente y restar los totales.
- `solicitudes_de_palabra` guarda el `participanteId` junto al `nombreVisible`. Quien tenga acceso a la base puede saber qué oradores con nombre tienen un código y, sumado a los riesgos de `xmin` y WAL de arriba, podría vincular el nombre de un orador con un voto. Quien quiera anonimato total debe usar un seudónimo al pedir la palabra.
- El `participanteId` es un código anónimo, no una persona. Solo identifica a alguien si fuera del sistema se vincula ese código con su dueño (por ejemplo, al entregar las papeletas con códigos).

La mitigación es confiar en quien opera la base de datos y limitar quién tiene ese acceso.

## Tiempo real

Proyección, celulares y mesa consultan un solo endpoint público, `GET /api/public/v1/salas/{codigoDeSala}/estado`. Responde con `Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=2` y un ETag `version-votosEmitidos` (la `Sesion.version` y el conteo de votos emitidos de la pregunta abierta), así que el borde de Vercel absorbe casi todas las consultas y devuelve 304 cuando nada cambió. La decisión y las mediciones están en [el ADR 0001](adr/0001-transporte-de-tiempo-real.md).

En el cliente, la fuente de estado (`FuenteDeEstadoPorConsulta`) recibe una política de intervalo: la proyección y la mesa consultan cada 3 s, y el celular adapta el intervalo según haya votación abierta o fila.

Nada por participante se consulta de forma periódica. "Ya voté" y "mi lugar en la fila" los calcula el celular con lo que devolvió su última acción y con el estado público. Así el endpoint puede ser público y cacheado sin filtrar datos de nadie.

## Pruebas

- `pnpm test`: unitarias de cada capa y de los componentes, sin base de datos.
- `pnpm test:int`: contra Postgres real (`podman compose up -d`), incluida la concurrencia de votos y cierres.
- `pnpm e2e`: Playwright sobre la aplicación construida y una base real. Recorre una sala con códigos entre varios navegadores y comprueba que ninguna pantalla desborde en 360, 768, 1280 y 1920 px. Las capturas de `docs/uso/capturas` las genera `pnpm --filter @kuorum/web capturas` contra una instalación local.
