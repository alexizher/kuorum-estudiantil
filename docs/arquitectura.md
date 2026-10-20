# Arquitectura

## Cómo se guarda el voto secreto

Toda pregunta es secreta. El voto se reparte en dos tablas que no se pueden unir:

- `votos_emitidos(preguntaId, participanteId)`: quién ya votó. Sin hora y sin opción. La clave primaria impide votar dos veces.
- `conteos(preguntaId, opcionId, shard, total)`: cuántos votos tiene cada opción. Cada opción tiene 16 filas (fragmentos) para que los votos simultáneos no compitan por la misma fila. Los resultados suman los fragmentos.

Un voto es una sola sentencia SQL: toma `FOR SHARE` sobre la pregunta, comprueba que esté abierta y que la opción sea suya, inserta en `votos_emitidos` y suma en un fragmento elegido al azar (`crypto.randomInt`). Cerrar una pregunta toma `FOR UPDATE`: espera a los votos en vuelo y los que llegan después ven la pregunta cerrada. Si hay una ráfaga que no lo deja entrar, el cierre reintenta tres veces (5 s de espera cada una) y luego responde `CIERRE_OCUPADO`.

### Qué queda protegido

- Ninguna fila ni columna une un participante con una opción. Tampoco hay hora por voto.
- Postgres guarda en cada fila el identificador de la transacción que la escribió (`xmin`). Si el voto actualizara solo la fila de la opción elegida, ese identificador coincidiría con el de `votos_emitidos` y delataría al votante. Por eso cada voto actualiza todas las opciones del fragmento (`total + (opcion = elegida)::int`): las filas tocadas comparten el `xmin` del votante sea cual sea su opción.
- Los códigos de acceso se guardan solo como hash SHA-256.

### Riesgo residual

Quien tenga acceso de superusuario a la base o al proveedor puede leer versiones muertas de filas (hasta que corra el vacuum) y el WAL, y de ahí deducir incrementos por transacción. La mitigación es confiar en quien opera la base de datos y limitar quién tiene ese acceso.
