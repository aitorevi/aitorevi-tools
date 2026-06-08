// Helpers compartidos entre herramientas. Sin estado y, salvo triggerDownload,
// sin dependencias del DOM, para poder testearlos en Node.

/** Quita la extensión .pdf y limpia caracteres problemáticos para nombres de fichero. */
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

/** ¿El fichero parece un PDF? (por MIME o, en su defecto, por extensión). */
export function isPdf(file) {
  return !(file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name));
}

/** Dispara la descarga de un Blob desde el navegador (sin tocar red). */
export function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Liberar el objeto URL tras un breve margen para que el navegador procese la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
