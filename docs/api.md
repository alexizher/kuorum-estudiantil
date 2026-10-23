# API pública

Rutas de solo lectura, sin autenticación, versionadas en `/api/public/v1`. Las respuestas se cachean en el borde 60 s (`s-maxage=60, stale-while-revalidate=300`): un cambio puede tardar hasta unos 6 minutos en verse.

## Calendario

`GET /api/public/v1/calendario`

| Parámetro        | Valor                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `desde`, `hasta` | Fechas ISO 8601. Sin ellas, de 30 días atrás a 180 adelante. El rango máximo es de 400 días. |
| `cuerpo`         | Identificador corto del cuerpo (`facultad-de-artes`).                                        |

```sh
curl "https://tu-instalacion.vercel.app/api/public/v1/calendario?cuerpo=facultad-de-artes"
```

```json
{
  "institucion": {
    "nombre": "Universidad de Ejemplo",
    "tipoDeCuerpoSingular": "Facultad",
    "tipoDeCuerpoPlural": "Facultades",
    "zonaHoraria": "America/Bogota"
  },
  "cuerpos": [
    {
      "slug": "facultad-de-artes",
      "nombre": "Facultad de Artes",
      "tipo": "FACULTAD",
      "archivado": false
    }
  ],
  "sesiones": [
    {
      "id": "6f1c...",
      "titulo": "Asamblea de Artes",
      "cuerpo": { "slug": "facultad-de-artes", "nombre": "Facultad de Artes" },
      "inicio": "2026-11-03T19:00:00.000Z",
      "fin": "2026-11-03T21:00:00.000Z",
      "modalidad": "PRESENCIAL",
      "lugar": "Auditorio",
      "estado": "PROGRAMADA"
    }
  ]
}
```

Las horas van en UTC; `zonaHoraria` dice cómo mostrarlas. Las sesiones canceladas salen con `"estado": "CANCELADA"`. Cada sesión lleva `actaId`: el id del acta si la sesión está en `ACTA_FINAL`, o `null`. No se publica el código de sala ni nada de lo que crea la cuenta de prueba.

Errores: `400 SOLICITUD_INVALIDA` si una fecha no se entiende, `404 CUERPO_NO_EXISTE`, `422 RANGO_INVALIDO`.

## Calendario en `.ics`

`GET /api/public/v1/calendario.ics` y `GET /api/public/v1/calendario.ics?cuerpo=facultad-de-artes`

Devuelve `text/calendar` con las sesiones de 30 días atrás a 365 adelante, una por evento. Las canceladas llevan `STATUS:CANCELLED`, así los calendarios suscritos las tachan o las quitan. Para suscribirse, pega la dirección en Google Calendar (Otros calendarios, Desde URL) o en Outlook (Agregar calendario, Suscribirse desde la web).

```sh
curl "https://tu-instalacion.vercel.app/api/public/v1/calendario.ics"
```

## Decisiones

`GET /api/public/v1/decisiones`

Una decisión por cada votación cerrada de sesiones con acta final. Mismos parámetros `desde`, `hasta` y `cuerpo` que el calendario; sin fechas, de 365 días atrás a mañana. El rango máximo es de 400 días.

```sh
curl "https://tu-instalacion.vercel.app/api/public/v1/decisiones?cuerpo=facultad-de-artes"
```

```json
{
  "decisiones": [
    {
      "id": "9a2e...",
      "cuerpo": { "slug": "facultad-de-artes", "nombre": "Facultad de Artes" },
      "sesion": { "id": "6f1c...", "titulo": "Asamblea de Artes" },
      "pregunta": "¿Aprueba el presupuesto?",
      "enunciado": "Se aprueba el presupuesto presentado.",
      "aprobada": true,
      "indicativa": false,
      "regla": "MAYORIA_SIMPLE",
      "resultado": {
        "totalVotos": 100,
        "asistentes": 142,
        "porOpcion": [{ "texto": "Sí", "votos": 70, "porcentaje": 70 }]
      },
      "cerradaEn": "2026-11-03T20:00:00.000Z"
    }
  ]
}
```

`enunciado` es `null` si la mesa no lo escribió. `indicativa` es `true` en las salas abiertas, donde el resultado no obliga. No salen sesiones sin acta final ni las de la cuenta de prueba. Errores: `400 SOLICITUD_INVALIDA`, `404 CUERPO_NO_EXISTE`, `422 RANGO_INVALIDO`.

## Actas

`GET /api/public/v1/actas`

Actas finales, con los mismos parámetros que las decisiones. El `id` es el de la sesión.

```json
{
  "actas": [
    {
      "id": "6f1c...",
      "cuerpo": { "slug": "facultad-de-artes", "nombre": "Facultad de Artes" },
      "titulo": "Asamblea de Artes",
      "inicio": "2026-11-03T19:00:00.000Z",
      "finalizadaEn": "2026-11-04T01:00:00.000Z",
      "codigo": "ABCDE-FGHJK",
      "pdf": "/api/public/v1/actas/6f1c....pdf"
    }
  ]
}
```

## Acta en PDF

`GET /api/public/v1/actas/{id}.pdf` (el `.pdf` es opcional)

Devuelve `application/pdf` con el acta final, su código de verificación y la dirección donde comprobarlo. Se cachea un día en el borde (`s-maxage=86400`). Si la sesión no tiene acta final, es borrador o es de la cuenta de prueba, responde `404 ACTA_NO_ENCONTRADA`.

## Verificar un acta

`/actas/verificar?codigo=ABCDE-FGHJK` es una página, no una ruta de la API. Acepta el código en minúsculas, con espacios o sin guion. Muestra cuerpo, título, fecha, cuándo se finalizó y el enlace al PDF; si el código no existe dice "No encontramos un acta con ese código".
