# @kuorum/ui

Sistema visual: tokens, estilos y componentes de presentación. Solo importa `react`, `qrcode` y `@kuorum/contracts` (regla `ui-sin-capas`).

- Los componentes TSX se compilan con `tsc` a `dist`, como el resto de paquetes. Next los consume ya compilados, sin `transpilePackages`. Los que usan estado o eventos llevan `"use client"`.
- Los estilos son CSS plano: `import "@kuorum/ui/estilos.css"` una vez en el layout de la app.
- El tema (`claro`, `oscuro`, `sistema`) se guarda en `localStorage` con la clave `kuorum-tema`. `SCRIPT_DE_TEMA` va en el `<head>` para fijar `data-tema` antes del primer pintado.
- `BloqueDeTinta` necesita un `<DefinicionesDeTinta />` en la página (el filtro SVG de la serigrafía).
