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

Las horas van en UTC; `zonaHoraria` dice cómo mostrarlas. Las sesiones canceladas salen con `"estado": "CANCELADA"`. No se publica el código de sala ni nada de lo que crea la cuenta de prueba.

Errores: `400 SOLICITUD_INVALIDA` si una fecha no se entiende, `404 CUERPO_NO_EXISTE`, `422 RANGO_INVALIDO`.

## Calendario en `.ics`

`GET /api/public/v1/calendario.ics` y `GET /api/public/v1/calendario.ics?cuerpo=facultad-de-artes`

Devuelve `text/calendar` con las sesiones de 30 días atrás a 365 adelante, una por evento. Las canceladas llevan `STATUS:CANCELLED`, así los calendarios suscritos las tachan o las quitan. Para suscribirse, pega la dirección en Google Calendar (Otros calendarios, Desde URL) o en Outlook (Agregar calendario, Suscribirse desde la web).

```sh
curl "https://tu-instalacion.vercel.app/api/public/v1/calendario.ics"
```
