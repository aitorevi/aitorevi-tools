// Lógica del separador de PDF. Los helpers genéricos viven en ../lib/files.js;
// aquí queda lo específico de PDF. `extractPage` recibe `PDFDocument` por
// inyección para ejercitarse igual en el navegador (window.PDFLib) que en Node.

export { sanitizeBaseName, formatBytes, isPdf, triggerDownload } from "../lib/files.js";

/** Nombre de cada página exportada. */
export function pageFileName(baseName, pageNumber) {
  return `${baseName}-pagina-${pageNumber}.pdf`;
}

/** Nombre del ZIP con la selección. */
export function zipFileName(baseName) {
  return `${baseName}-paginas.zip`;
}

/** Crea un PDF de una sola página (índice 0-based) y devuelve sus bytes. */
export async function extractPage(PDFDocument, srcBytes, pageIndex) {
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(src, [pageIndex]);
  out.addPage(copied);
  return out.save();
}
