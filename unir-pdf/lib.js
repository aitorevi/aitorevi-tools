// Lógica del unificador de PDF. Los helpers genéricos viven en ../lib/files.js.
// `mergePdfs` recibe `PDFDocument` por inyección para ejercitarse igual en el
// navegador (window.PDFLib) que en Node.

export { sanitizeBaseName, formatBytes, isPdf, triggerDownload } from "../lib/files.js";

/**
 * Une varios PDFs en uno solo, respetando el orden recibido.
 * @param {*} PDFDocument - clase PDFDocument de pdf-lib.
 * @param {ArrayBuffer[]} sources - bytes de cada PDF, en el orden final.
 * @returns {Promise<Uint8Array>} bytes del PDF combinado.
 */
export async function mergePdfs(PDFDocument, sources) {
  if (!sources || sources.length === 0) {
    throw new Error("No hay PDFs que unir");
  }
  const out = await PDFDocument.create();
  for (const bytes of sources) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return out.save();
}

/** Nombre del fichero combinado. */
export function mergedFileName(baseName = "documento") {
  return `${baseName}-unido.pdf`;
}
