// Marca de agua PDF — añade un texto en diagonal a cada página, 100% cliente.
// `addWatermark` recibe el namespace `PDFLib` (necesita PDFDocument, rgb,
// degrees, StandardFonts) por inyección para testearse igual en Node.

export { sanitizeBaseName, formatBytes, isPdf, triggerDownload } from "../lib/files.js";

const RAD = Math.PI / 180;

/**
 * Estampa un texto en diagonal, centrado, en todas las páginas del PDF.
 * @param {*} PDFLib - namespace de pdf-lib (window.PDFLib).
 * @param {ArrayBuffer|Uint8Array} srcBytes
 * @param {{text?:string,fontSize?:number,opacity?:number,angle?:number,color?:{r:number,g:number,b:number}}} options
 * @returns {Promise<Uint8Array>}
 */
export async function addWatermark(PDFLib, srcBytes, options = {}) {
  const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
  const {
    text = "CONFIDENCIAL",
    fontSize = 48,
    opacity = 0.3,
    angle = 45,
    color = { r: 0.6, g: 0.6, b: 0.6 },
  } = options;

  if (!text.trim()) throw new Error("El texto de la marca de agua está vacío");

  const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    // Punto de inicio para que el texto rotado quede centrado en la página.
    const x = width / 2 - (textWidth / 2) * Math.cos(angle * RAD);
    const y = height / 2 - (textWidth / 2) * Math.sin(angle * RAD);
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle),
    });
  }
  return doc.save();
}

/** Nombre del PDF con marca de agua. */
export function watermarkedFileName(baseName = "documento") {
  return `${baseName}-marca-de-agua.pdf`;
}
