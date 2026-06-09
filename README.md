# aitorevi.tools

Hub de **mini-herramientas web** que funcionan **100% en el navegador**: sin
registro, sin backend y sin que tus archivos salgan de tu dispositivo.

🔗 **Hub:** https://tools.aitorevi.dev
📄 **Ficha del proyecto:** https://www.aitorevi.dev/work/tools

## Herramientas

| Ruta | Herramienta | Descripción |
|---|---|---|
| `/separar-pdf/` | Separar PDF | Divide un PDF en páginas sueltas; descarga individual o en ZIP. |
| `/unir-pdf/` | Unir PDF | Combina varios PDFs en uno, reordenables. |
| `/imagen-a-pdf/` | Imagen a PDF | Convierte JPG/PNG en un PDF, reordenables. |
| `/marca-de-agua-pdf/` | Marca de agua en PDF | Añade un texto en diagonal a todas las páginas. |
| `/n-up-pdf/` | Varias páginas por hoja | Coloca 2/4/6/9 páginas por hoja A4 para imprimir. |
| `/comprimir-imagen/` | Comprimir imagen | Reduce el peso (calidad, tamaño o peso objetivo). |
| `/convertir-imagen/` | Convertir imagen | Convierte entre PNG, JPG y WebP. |
| `/quitar-metadatos-imagen/` | Quitar metadatos | Elimina EXIF/GPS/cámara sin perder calidad. |

## Arquitectura

El sitio es estático y se genera desde una **fuente única** con un generador en
Node sin dependencias. Editas el origen y ejecutas `npm run build`; el HTML
resultante se commitea y Vercel lo sirve tal cual.

```
/
├── tools.json            # FUENTE ÚNICA: metadata de cada tool + secciones del hub
├── build.mjs             # Generador (Node puro): ensambla el HTML, el hub y el sitemap
├── partials/             # Bloques compartidos (navbar, footer social, licencia MIT, estilo del hub)
├── <slug>/
│   ├── body.html         # ÚNICO por tool: <style> opcional + <main> (lo que se edita a mano)
│   ├── app.js            # Cableado del DOM
│   ├── lib.js            # Lógica pura/testeable (sin DOM)
│   └── index.html        # ⚙️ GENERADO — no editar a mano
├── index.html            # ⚙️ GENERADO (hub)
├── sitemap.xml           # ⚙️ GENERADO
├── styles.css            # Estilos compartidos (tokens, navbar, footer, botones, inputs)
├── theme.js              # Tema claro/oscuro por clase (.dark), antes del paint
├── lib/                  # Utilidades compartidas (files.js, images.js)
├── fonts/                # Outfit + JetBrains Mono (subset latin)
├── vendor/               # Librerías vendorizadas con versión fija (pdf-lib @1.17.1, jszip @3.10.1)
└── robots.txt · vercel.json · serve.mjs
```

> **Regla de oro:** los `index.html` y el `sitemap.xml` son **artefactos
> generados**. No los edites a mano: cambia `tools.json`, los `partials/` o el
> `body.html` correspondiente y ejecuta `npm run build`.

### Añadir una herramienta

1. Crea `nueva-tool/body.html` (un `<main class="wrap">` con su UI; un `<style>`
   inicial opcional se sube solo al `<head>`).
2. Crea `nueva-tool/app.js` (+ `lib.js` para la lógica pura testeable).
3. Añade su entrada a `tools.json` (slug, sección, libs, metadatos SEO, card).
4. `npm run build` → genera su `index.html`, su card en el hub y el `sitemap.xml`.

## Privacidad

No hay backend, ni registro, ni analítica. Los archivos se procesan en memoria
en el navegador. Las herramientas de PDF usan [`pdf-lib`](https://pdflib.js.org/)
y [`JSZip`](https://stuk.github.io/jszip/) vendorizados (sin CDN externo); las de
imagen usan Canvas y manipulación de bytes nativa. La CSP (`connect-src 'self'`)
garantiza a nivel de navegador que nada sale del dispositivo.

## Desarrollo local

```bash
npm run build         # regenera index.html de cada tool + hub + sitemap
node serve.mjs        # http://localhost:8099 (anti-caché, resuelve /<slug>/ → index.html)
```

> Ábrelo con un servidor (no con `file://`) para que las rutas absolutas
> (`/styles.css`, `/vendor`, `/theme.js`…) resuelvan correctamente.

## Tests

La lógica pura/PDF vive en `<slug>/lib.js` (sin DOM, testeable); el cableado del
DOM queda en `app.js`.

```bash
npm install                    # solo la primera vez (devDeps: vitest + playwright)
npx playwright install chromium

npm run test:unit              # Vitest — funciones puras (lib.js)
npm run test:e2e               # Playwright — levanta serve.mjs y prueba la app real
npm test                       # ambos
```

- **Unit/integración** (`tests/`): ejercitan la **misma** pdf-lib vendorizada.
- **E2E** (`e2e/`): Playwright levanta `serve.mjs` y prueba las 8 herramientas.
- El tooling de test son **devDeps** y no se instalan en el despliegue
  (`vercel.json` salta `install`/`build`).

## Despliegue

Proyecto estático en Vercel (sin build command, output en la raíz). Cabeceras de
seguridad y CSP definidas en [`vercel.json`](./vercel.json).

## Licencia

MIT © Aitor Reviriego
