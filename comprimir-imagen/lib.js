// Comprimir imagen — reduce el peso (calidad + tamaño) en el navegador (Canvas).

export {
  isImageFile,
  baseNameNoExt,
  extForMime,
  fitDimensions,
  loadBitmap,
  drawToCanvas,
  canvasToBlob,
} from "../lib/images.js";
export { triggerDownload, formatBytes } from "../lib/files.js";

/** Límites de lado mayor ofrecidos. value 0 = sin redimensionar. */
export const MAX_SIDES = [
  { value: 0, label: "Original" },
  { value: 2560, label: "2560 px" },
  { value: 1920, label: "1920 px" },
  { value: 1280, label: "1280 px" },
  { value: 1024, label: "1024 px" },
];

/** % de reducción de tamaño (0 si no se redujo). */
export function reductionPercent(originalSize, newSize) {
  if (!originalSize) return 0;
  return Math.max(0, Math.round((1 - newSize / originalSize) * 100));
}

/** Nombre del fichero comprimido. */
export function compressedFileName(base, ext) {
  return `${base}-comprimida.${ext}`;
}
