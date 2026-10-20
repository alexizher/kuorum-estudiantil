# ADR 0001: transporte de tiempo real

Estado: borrador, pendiente de medición.

## Contexto

La pantalla pública de una sesión necesita saber cuándo cambia el estado (la `version` sube). Hay dos transportes candidatos, ambos servidos por funciones de Vercel sobre Neon:

- Consulta: cada cliente pide `GET /api/public/v1/sesiones/{id}/estado` cada pocos segundos con `If-None-Match`. La respuesta lleva `Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=2`, así que el borde absorbe casi todo y la base se consulta unas pocas veces por segundo.
- Eventos: cada cliente mantiene abierto `GET /api/public/v1/sesiones/{id}/eventos` (SSE). La función consulta la base cada 1 s por conexión y cierra a los 290 s para que el cliente reconecte.

La cuota gratuita de Vercel y de Neon es el límite real. Hay que saber qué tamaño de sesión aguanta cada transporte sin dominio propio ni Cloudflare por delante.

## Método de medición

Las cargas salen de GitHub Actions (`.github/workflows/carga.yml`, solo manual), no de la conexión local. Cada corrida usa una sesión creada con `tools/load/preparar.mjs` y la avanza `tools/load/avanzar.mjs` (una versión cada 10 s).

Corridas previstas:

1. Consulta: 300 VUs, intervalo 3 s, 5 min (unas 30.000 peticiones).
2. Eventos: 300 conexiones, 5 min.

Tras cada corrida se anota, del panel de uso de Vercel y de Neon: edge requests, invocaciones, CPU activa, memoria aprovisionada y CU-hora. Presupuesto total: 150.000 peticiones entre todas las corridas.

Con las cifras se extrapola a una asamblea general de 3.000 personas durante 3 horas y a 5 sesiones de facultad simultáneas de 300.

## Límites oficiales de Vercel y Neon

Pendiente de medición.

## Mediciones

Pendiente de medición.

## Extrapolación

Pendiente de medición.

## Decisión

Pendiente de medición.

## Consecuencias

Pendiente de medición.
