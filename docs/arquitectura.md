# Arquitectura

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
