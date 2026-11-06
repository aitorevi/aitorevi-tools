// Convertir imagen — PNG ↔ JPG ↔ WebP en el navegador (Canvas).
// La conversión real (Canvas) vive en app.js; aquí, datos y helpers puros.

export {
  isImageFile,
  baseNameNoExt,
  extForMime,
  loadBitmap,
  drawToCanvas,
  canvasToBlob,
} from "../lib/images.js";
export { triggerDownload, formatBytes } from "../lib/files.js";

/** Formatos de salida soportados. */
export const TARGETS = [
  { value: "image/png", label: "PNG", ext: "png", lossy: false },
  { value: "image/jpeg", label: "JPG", ext: "jpg", lossy: true },
  { value: "image/webp", label: "WebP", ext: "webp", lossy: true },
];

/** ¿El formato de salida admite calidad (con pérdida)? */
export function isLossy(mime) {
  return mime === "image/jpeg" || mime === "image/webp";
}

/** Nombre del fichero convertido. */
export function convertedFileName(base, ext) {
  return `${base}.${ext}`;
}

/** ¿Es HEIC/HEIF? (el navegador no lo decodifica; va por el worker WASM). */
export function isHeicFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/i.test(file.name || "");
}

/** Etiqueta del formato de entrada para mostrar (por extensión). */
export function inputFormatLabel(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return m ? m[1].toUpperCase() : "?";
}

/** Evita nombres repetidos (p. ej. foto.png y foto.jpg → foto.webp, foto-2.webp). */
export function uniqueFileNames(names) {
  const used = new Set();
  return names.map((name) => {
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let candidate = name;
    for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${stem}-${i}${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
