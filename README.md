# aitorevi.tools

Hub de **mini-herramientas web** que funcionan **100% en el navegador**: sin
registro, sin backend y sin que tus archivos salgan de tu dispositivo.

🔗 **Hub:** https://tools.aitorevi.dev
📄 **Ficha del proyecto:** https://www.aitorevi.dev/work/tools

## Herramientas

| Ruta | Herramienta | Descripción |
|---|---|---|
| `/separar-pdf/` | Separador de PDF | Divide un PDF en páginas sueltas; descarga individual o en ZIP. |
| `/unir-pdf/` | Unir PDF | Combina varios PDFs en uno, reordenables. |

## Estructura

```
/
├── index.html            # Hub: landing con cards de herramientas
├── styles.css            # Estilos compartidos (tokens, navbar, footer)
├── theme.js              # Tema claro/oscuro por clase (.dark)
├── fonts/                # Outfit + JetBrains Mono (subset latin)
├── vendor/               # Librerías vendorizadas con versión fija
│   ├── pdf-lib.min.js    # @1.17.1
│   └── jszip.min.js      # @3.10.1
├── separar-pdf/        # Herramienta: separador de PDF
│   ├── index.html
│   └── app.js
├── robots.txt · vercel.json · serve.mjs
```

Cada herramienta vive en su carpeta y reutiliza `styles.css`, `theme.js`,
`fonts/` y `vendor/` mediante rutas absolutas (`/styles.css`, etc.).

## Privacidad

No hay backend, ni registro, ni analítica. Los archivos se procesan en memoria
en el navegador. El separador usa [`pdf-lib`](https://pdflib.js.org/) y
[`JSZip`](https://stuk.github.io/jszip/), ambos vendorizados (sin CDN externo).

## Desarrollo local

No hay build. Sirve la carpeta con el servidor de desarrollo (anti-caché, y
resuelve `/separar-pdf/` → `index.html`):

```bash
node serve.mjs        # http://localhost:8099
```

> Ábrelo con un servidor (no con `file://`) para que las rutas absolutas
> (`/styles.css`, `/vendor`, `/theme.js`…) resuelvan correctamente.

## Tests

La lógica pura/PDF vive en `separar-pdf/lib.js` (sin DOM, testeable); el
cableado del DOM queda en `app.js`.

```bash
npm install                    # solo la primera vez (devDeps: vitest + playwright)
npx playwright install chromium

npm run test:unit              # Vitest — funciones puras + extractPage (lib.js)
npm run test:e2e               # Playwright — drop real, descarga ZIP, toggle de tema
npm test                       # ambos
```

- **Unit/integración** (`tests/`): ejercitan la **misma** pdf-lib vendorizada.
- **E2E** (`e2e/`): Playwright levanta `serve.mjs` y prueba la app real.
- El tooling de test son **devDeps** y no se instalan en el despliegue
  (`vercel.json` salta `install`/`build`).

## Despliegue

Proyecto estático en Vercel (sin build command, output en la raíz). Cabeceras
de seguridad y `noindex` definidos en [`vercel.json`](./vercel.json).

## Licencia

MIT © Aitor Reviriego
