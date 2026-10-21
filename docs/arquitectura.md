# Arquitectura

Monorepo de TypeScript con pnpm y Turborepo. El código se reparte en capas y una regla de CI (dependency-cruiser) impide que se mezclen.

## Capas

```
domain  <-  application  <-  infrastructure  <-  apps/web
                 ^                                  |
              contracts  <------------------------- +
```

| Paquete                   | Responsabilidad                                                                                                                   | Puede importar          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `packages/domain`         | Reglas de la asamblea: sesión, preguntas, fila de intervenciones. TypeScript puro.                                                | Nada fuera de sí mismo  |
| `packages/application`    | Un caso de uso por clase (`EmitirVoto`, `DarLaPalabra`, `ConsultarEstadoDeSala`). Define los puertos (repositorios, reloj, hash). | `domain`                |
| `packages/infrastructure` | Implementa los puertos: Postgres con Prisma 7 (adaptadores `pg` y Neon), hash SHA-256 de códigos, autenticación de la mesa.       | `domain`, `application` |
| `packages/contracts`      | Esquemas zod de lo que entra y sale por la API.                                                                                   | Solo zod                |
| `packages/ui`             | Tokens, tema claro y oscuro, componentes de presentación sin reglas de negocio.                                                   | React                   |
| `apps/web`                | Next.js 16: rutas de la API, las vistas y la composición (`composicion.ts`), el único lugar donde se instancian las dependencias. | Todos los anteriores    |

Los nombres del dominio van en español (`Sesion`, `Pregunta`, `SolicitudDeLaPalabra`) y el resto en inglés. Los errores del dominio llevan un `codigo` estable (`YA_VOTO`, `CIERRE_OCUPADO`) y la API los traduce con `respuestaDeError`.

## Agregados

- **Sesion.** Una asamblea con su código de sala, su modo (`CON_CODIGOS` o `SALA_ABIERTA`), su estado (`PROGRAMADA`, `EN_CURSO`, `CERRADA`, entre otros) y una `version` que sube con cada cambio de la sala, dentro de la misma transacción. Esa versión es el ETag del estado público.
- **Pregunta.** Pertenece a una sesión, tiene sus opciones y pasa de `BORRADOR` a `ABIERTA` y `CERRADA`, o a `ANULADA`. El resultado se calcula al cerrar y la mesa decide cuándo proyectarlo.
- **Participante y código de acceso.** El código se genera una vez, se muestra una vez y se guarda solo como hash. Activarlo crea un participante anónimo, que es lo que cuenta como un voto.
- **Cola de intervenciones.** Solicitudes de palabra y mociones. Las mociones pasan adelante según su prioridad, y quien habla tiene un tiempo que la mesa puede ampliar.

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
- El `participanteId` es un código anónimo, no una persona. Solo identifica a alguien si fuera del sistema se vincula ese código con su dueño (por ejemplo, al entregar las papeletas con códigos).

La mitigación es confiar en quien opera la base de datos y limitar quién tiene ese acceso.

## Tiempo real

Proyección, celulares y mesa consultan un solo endpoint público, `GET /api/public/v1/salas/{codigoDeSala}/estado`. Responde con `Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=2` y un ETag derivado de `Sesion.version`, así que el borde de Vercel absorbe casi todas las consultas y devuelve 304 cuando nada cambió. La decisión y las mediciones están en [el ADR 0001](adr/0001-transporte-de-tiempo-real.md).

En el cliente, la fuente de estado (`FuenteDeEstadoPorConsulta`) recibe una política de intervalo: la proyección y la mesa consultan cada 3 s, y el celular adapta el intervalo según haya votación abierta o fila.

Nada por participante se consulta de forma periódica. "Ya voté" y "mi lugar en la fila" los calcula el celular con lo que devolvió su última acción y con el estado público. Así el endpoint puede ser público y cacheado sin filtrar datos de nadie.

## Pruebas

- `pnpm test`: unitarias de cada capa y de los componentes, sin base de datos.
- `pnpm test:int`: contra Postgres real (`podman compose up -d`), incluida la concurrencia de votos y cierres.
- `pnpm e2e`: Playwright sobre la aplicación construida y una base real. Recorre una sala con códigos entre varios navegadores y comprueba que ninguna pantalla desborde en 360, 768, 1280 y 1920 px. Las capturas de `docs/uso/capturas` las genera `pnpm --filter @kuorum/web capturas` contra una instalación local.
