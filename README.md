# Separador de PDF

Herramienta web que divide un PDF en sus páginas individuales. Funciona
**100% en el navegador**: ningún archivo se sube a un servidor.

🔗 **App:** https://tools.aitorevi.dev
📄 **Ficha del proyecto:** https://www.aitorevi.dev/work/pdf-separator

## Qué hace

- Cargas un PDF (arrastrando o desde el selector de archivos).
- Eliges qué páginas quieres.
- Las descargas **una a una** o **todas juntas en un ZIP**.

Cada página se exporta como un PDF independiente (`nombre-pagina-N.pdf`).

## Privacidad

No hay backend, ni registro, ni analítica. El PDF se procesa en memoria con
[`pdf-lib`](https://pdflib.js.org/) y el empaquetado ZIP con
[`JSZip`](https://stuk.github.io/jszip/). Tus documentos nunca salen de tu
dispositivo.

## Stack

- HTML/CSS/JS estáticos, sin build.
- Dependencias **vendorizadas** en `vendor/` con versión fija (sin CDN externo):
  - `pdf-lib@1.17.1`
  - `jszip@3.10.1`

## Desarrollo local

Al no haber build, basta con servir la carpeta con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8080
```

> Ábrelo con un servidor (no con `file://`) para que las rutas absolutas de
> `/vendor` y `/app.js` resuelvan correctamente.

## Despliegue

Proyecto estático en Vercel (sin build command, output en la raíz). Cabeceras
de seguridad y `noindex` definidos en [`vercel.json`](./vercel.json).

## Licencia

MIT © Aitor Reviriego
