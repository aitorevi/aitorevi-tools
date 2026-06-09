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
