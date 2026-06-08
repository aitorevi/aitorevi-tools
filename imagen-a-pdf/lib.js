// Imagen a PDF — combina varias imágenes en un PDF, 100% en el navegador.
// Helpers genéricos en ../lib/files.js. `imagesToPdf` recibe `PDFDocument`
// por inyección para ejercitarse igual en el navegador que en Node.

export { sanitizeBaseName, formatBytes, triggerDownload } from "../lib/files.js";

/** ¿El fichero es una imagen soportada (JPG o PNG)? */
export function isSupportedImage(file) {
  return /^image\/(jpe?g|png)$/i.test(file.type) || /\.(jpe?g|png)$/i.test(file.name);
}

/**
 * Crea un PDF con una imagen por página (tamaño de página = tamaño de la imagen),
 * respetando el orden recibido.
 * @param {*} PDFDocument - clase PDFDocument de pdf-lib.
 * @param {{ bytes: ArrayBuffer|Uint8Array, type: string }[]} images
 * @returns {Promise<Uint8Array>} bytes del PDF.
 */
export async function imagesToPdf(PDFDocument, images) {
  if (!images || images.length === 0) throw new Error("No hay imágenes");
  const out = await PDFDocument.create();
  for (const img of images) {
    const isPng = /png/i.test(img.type);
    const embedded = isPng ? await out.embedPng(img.bytes) : await out.embedJpg(img.bytes);
    const page = out.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  return out.save();
}

/** Nombre del PDF resultante. */
export function outputFileName(baseName = "imagenes") {
  return `${baseName}.pdf`;
}
