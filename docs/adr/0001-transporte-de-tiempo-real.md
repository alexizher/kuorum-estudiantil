# ADR 0001: transporte de tiempo real

Estado: aceptado (2026-10-20).

## Contexto

La pantalla pública de una sesión necesita saber cuándo cambia el estado (la `version` sube). El despliegue de referencia corre en Vercel Hobby con Neon, sin dominio propio, y la cuota gratuita es el límite real. Hay que saber qué tamaño de sesión aguanta cada transporte en ese plan.

## Opciones

- Consulta periódica: cada cliente pide `GET /api/public/v1/sesiones/{id}/estado` cada pocos segundos con `If-None-Match`. La respuesta lleva `Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=2`, así que el borde absorbe casi todo y la base se consulta unas pocas veces por segundo. Cada consulta cuenta como una petición de CDN.
- Eventos enviados por el servidor (SSE): cada cliente mantiene abierta una conexión a una función de Vercel, que consulta la base cada 1 s y cierra a los 290 s para que el cliente reconecte. Gasta pocas peticiones, pero cada conexión ocupa una función durante toda la sesión.
- Un servicio WebSocket externo: no se midió. Queda fuera del plan gratuito sin servicios adicionales y se deja como posibilidad futura detrás de la interfaz `FuenteDeEstado`.

## Mediciones

Despliegue medido: `kuorum-estudiantil-demo.vercel.app`, plan Hobby, región iad1. Las cargas salieron de GitHub Actions (`ubuntu-latest`), no de la conexión local. La sesión de prueba la avanzaba un proceso aparte con una versión nueva cada 10 s.

|                      | Corrida 1: consulta                                                                         | Corrida 2: SSE                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Ejecución de Actions | 39345301807                                                                                 | 39346931640                                                                          |
| Carga                | 300 usuarios virtuales, intervalo de 3 s, 5 min, `If-None-Match`, desfase inicial aleatorio | 300 conexiones, 5 min, versión nueva cada 10 s                                       |
| Peticiones           | 29.733 (98/s), 0 % de fallos, 100 % de checks                                               | 600 aperturas (cada conexión se reabrió una vez tras el cierre planeado a los 290 s) |
| Latencia             | media 20,6 ms, mediana 14,6 ms, p90 26,6 ms, p95 35,3 ms, máximo 1,11 s                     | 9.300 eventos recibidos (31 por conexión), ninguno perdido                           |
| Errores              | ninguno                                                                                     | 300, todos cierres planeados                                                         |

En la corrida 1 se verificó a mano la caché del borde: `x-vercel-cache` pasa por MISS, HIT, STALE y HIT. El cliente ve `cache-control: public, max-age=0` porque Vercel consume `s-maxage`. Con `If-None-Match` responde 304, y una sesión inexistente da 404.

Uso del mes en el panel de Vercel (cuenta personal; incluye las dos corridas y las pruebas manuales; lo leyó una persona en el panel, porque la CLI no da métricas en Hobby):

| Métrica                  | Uso         | Límite Hobby |
| ------------------------ | ----------- | ------------ |
| CDN Requests             | 31K         | ~1M          |
| CDN Request CPU Duration | 15 s        |              |
| Function Invocations     | 1,9K        |              |
| Fluid Provisioned Memory | 51,4 GB-h   | 360 GB-h     |
| Fluid Active CPU         | 32 min 53 s | 4 h          |
| Fast Data Transfer       | 33 MB       | 100 GB       |
| Fast Origin Transfer     | 0,94 MB     |              |

Los límites son los que se esperaban al medir y hay que confirmarlos en https://vercel.com/docs/limits antes de depender de ellos. Al exceder una cuota, Vercel pausa el despliegue.

Atribución: casi toda la memoria y la CPU salen del SSE. Eran 300 conexiones abiertas unos 5 minutos, cada una con una consulta a la base por segundo (unas 90.000 consultas). La consulta periódica gastó casi solo peticiones de CDN (~30K) y unas 1,3K invocaciones, que son los fallos de caché.

## Extrapolación

Una asamblea general de 3.000 personas durante 3 horas es 10 veces más personas y 36 veces más tiempo que la medición:

| Transporte        | Peticiones de CDN                  | Memoria                               | CPU activa                 |
| ----------------- | ---------------------------------- | ------------------------------------- | -------------------------- |
| Consulta cada 3 s | ~10,8M (10 veces la cuota mensual) | despreciable                          | despreciable               |
| SSE               | ~112K                              | ~18.500 GB-h (~50 veces los 360 GB-h) | ~200 h (~50 veces las 4 h) |

Un lector compartido por sesión bajaría la CPU de las consultas a la base, pero no la memoria de mantener las conexiones abiertas.

Con Cloudflare delante (dominio propio, plan gratuito, sin cobro por petición), Vercel recibe unas 0,5 peticiones por segundo por sesión abierta, y la general de 3.000 cabe con holgura.

Sin dominio, la cuota de 1M de peticiones al mes alcanza para unas 830 persona-hora con intervalo fijo de 3 s, o unas 2.000 con el intervalo adaptativo (3 s solo con votación abierta o en la fila, 12 s el resto). La cifra de 2.000 es una estimación, no una medición: supone que la persona pasa cerca del 22 % del tiempo en estado activo (3 s) y el resto en reposo (12 s). Como referencia, serían unas 830 con 3 s siempre y unas 3.300 con 12 s siempre.

## Decisión

Transporte por defecto: consulta periódica con la caché del borde (2 s) y un intervalo adaptativo:

- 3 s mientras hay una votación abierta o la persona está en la fila de palabra.
- 12 s en el resto del tiempo.
- En pausa mientras la pestaña está oculta.

Los intervalos son constantes con nombre en `apps/web/src/tiempo-real/intervalo-adaptativo.ts`, y `FuenteDeEstadoPorConsulta` los toma de un `PoliticaDeIntervalo`.

SSE se descarta en Vercel Hobby por dos razones. Para una general de 3.000 personas supera unas 50 veces las cuotas de memoria y de CPU. Además, mantener una función abierta por conexión hace barato agotar la cuota abriendo conexiones. La consulta con CDN tampoco es inmune: alguien puede inundarla contra la cuota de 1M de peticiones. En ambos casos la mitigación es el borde (Cloudflare) y, más adelante, limitar la tasa de peticiones. Se eliminan la ruta `/api/public/v1/sesiones/{id}/eventos`, `FuenteDeEstadoPorEventos`, sus pruebas y la opción `eventos` de `tools/load` y de `carga.yml`. La interfaz `FuenteDeEstado` se conserva para conectar otro transporte (por ejemplo un servicio WebSocket externo) sin tocar a quien la usa.

Guía de capacidad:

- Sin dominio propio: unas 830 persona-hora al mes con 3 s fijos, o unas 2.000 con el intervalo adaptativo (estimación, ver Extrapolación).
- Con dominio propio y Cloudflare gratuito delante: cabe una general de 3.000 personas.
- Los límites hay que revisarlos en https://vercel.com/docs/limits, porque Vercel los cambia.

## Consecuencias

- La fase 1 usa `FuenteDeEstadoPorConsulta` con `PoliticaAdaptativa`. El contexto (votación abierta, fila de palabra) lo aporta la pantalla que se suscribe.
- El panel de administración estimará el uso mensual a partir de las sesiones programadas y avisará si se acerca a la cuota.
- La documentación recomienda Cloudflare para asambleas generales de más de unas 300 personas.
- Con un intervalo de 12 s en reposo, un cambio puede tardar hasta unos 14 a 16 s en llegar a quien no está en votación ni en la fila (12 s de intervalo más hasta 4 s de la caché: 2 de `s-maxage` y 2 de `stale-while-revalidate`).

## Cómo repetir la medición

1. Crear una sesión de pruebas con `node tools/load/preparar.mjs`. Imprime el id.
2. Lanzar el flujo `Carga` en GitHub Actions (`.github/workflows/carga.yml`, solo manual) con la URL del despliegue, el id de la sesión, `consulta` como transporte, hasta 300 usuarios y hasta 10 minutos. El flujo avanza la versión cada 10 s con `tools/load/avanzar.mjs` y corre `tools/load/consulta.k6.js`.
3. Leer el panel de uso de Vercel antes y después y restar. El presupuesto total de peticiones entre corridas es de 150.000.
4. Repetir la extrapolación con las cifras nuevas.
