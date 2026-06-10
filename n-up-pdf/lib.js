// n-up PDF — coloca varias páginas por hoja (2, 4, 6, 9), 100% en el navegador.
// `nUpPdf` recibe el namespace `PDFLib` por inyección para testearse en Node.

export { sanitizeBaseName, formatBytes, isPdf, triggerDownload } from "../lib/files.js";

// Tamaño A4 en puntos.
export const A4 = { width: 595.28, height: 841.89 };

const LAYOUTS = {
  2: [1, 2],
  4: [2, 2],
  6: [2, 3],
  9: [3, 3],
};

/**
 * Genera un PDF con `perSheet` páginas de origen colocadas en cada hoja.
 * Acepta uno o varios PDFs: las páginas de todos ellos se concatenan en orden y
 * se reparten de forma continua por las hojas.
 * @param {*} PDFLib - namespace de pdf-lib (window.PDFLib).
 * @param {ArrayBuffer|Uint8Array|Array<ArrayBuffer|Uint8Array>} sources
 * @param {{perSheet?:number, landscape?:boolean, margin?:number, gap?:number}} options
 * @returns {Promise<Uint8Array>}
 */
export async function nUpPdf(PDFLib, sources, options = {}) {
  const { PDFDocument } = PDFLib;
  const { perSheet = 2, landscape = false, margin = 24, gap = 12 } = options;
  // La rejilla base está pensada para hoja vertical. En horizontal se intercambian
  // columnas y filas para que las páginas queden una al lado de la otra (no apiladas).
  let [cols, rows] = LAYOUTS[perSheet] || [1, perSheet];
  if (landscape) [cols, rows] = [rows, cols];

  const sheetWidth = landscape ? A4.height : A4.width;
  const sheetHeight = landscape ? A4.width : A4.height;

  const list = Array.isArray(sources) ? sources : [sources];
  const out = await PDFDocument.create();
  const embedded = [];
  for (const bytes of list) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const eps = await out.embedPdf(bytes, src.getPageIndices());
    for (const ep of eps) embedded.push(ep);
  }

  const cellW = (sheetWidth - 2 * margin - (cols - 1) * gap) / cols;
  const cellH = (sheetHeight - 2 * margin - (rows - 1) * gap) / rows;

  for (let i = 0; i < embedded.length; i += perSheet) {
    const sheet = out.addPage([sheetWidth, sheetHeight]);
    for (let k = 0; k < perSheet && i + k < embedded.length; k++) {
      const ep = embedded[i + k];
      const col = k % cols;
      const row = Math.floor(k / cols);
      const scale = Math.min(cellW / ep.width, cellH / ep.height);
      const w = ep.width * scale;
      const h = ep.height * scale;
      const cellX = margin + col * (cellW + gap);
      const cellTop = sheetHeight - margin - row * (cellH + gap);
      const x = cellX + (cellW - w) / 2;
      const y = cellTop - cellH + (cellH - h) / 2;
      sheet.drawPage(ep, { x, y, xScale: scale, yScale: scale });
    }
  }
  return out.save();
}

/** Nombre del PDF resultante. */
export function nUpFileName(baseName = "documento", perSheet = 2) {
  return `${baseName}-${perSheet}-por-hoja.pdf`;
}
