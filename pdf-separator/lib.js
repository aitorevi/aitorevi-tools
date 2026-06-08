// Lógica pura y testeable del separador de PDF.
// Sin dependencias del DOM. `extractPage` recibe `PDFDocument` por inyección
// para poder ejercitarse igual en el navegador (window.PDFLib) que en Node.

/** Quita la extensión y limpia caracteres problemáticos para nombres de fichero. */
export function sanitizeBaseName(fileName) {
  const noExt = fileName.replace(/\.pdf$/i, "");
  const cleaned = noExt.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "documento";
}

/** Tamaño legible: B / KB / MB. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Nombre de cada página exportada. */
export function pageFileName(baseName, pageNumber) {
  return `${baseName}-pagina-${pageNumber}.pdf`;
}

/** Nombre del ZIP con la selección. */
export function zipFileName(baseName) {
  return `${baseName}-paginas.zip`;
}

/** ¿El fichero parece un PDF? (por MIME o, en su defecto, por extensión). */
export function isPdf(file) {
  return !(file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name));
}

/** Crea un PDF de una sola página (índice 0-based) y devuelve sus bytes. */
export async function extractPage(PDFDocument, srcBytes, pageIndex) {
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(src, [pageIndex]);
  out.addPage(copied);
  return out.save();
}
