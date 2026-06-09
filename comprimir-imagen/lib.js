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
  { value: 1600, label: "1600 px" },
  { value: 1280, label: "1280 px" },
  { value: 1024, label: "1024 px" },
  { value: 800, label: "800 px" },
  { value: 640, label: "640 px" },
  { value: 480, label: "480 px" },
];

/**
 * Binarysearch del valor de calidad más alto cuyo tamaño quepa en el objetivo.
 * `encode(quality) -> Promise<number>` devuelve el tamaño en bytes a esa calidad.
 * Devuelve { quality, size } del mejor candidato, o null si ni la mínima cabe.
 */
export async function searchQualityForTarget(encode, targetBytes, { min = 0.1, max = 0.95, steps = 7 } = {}) {
  let lo = min;
  let hi = max;
  let best = null;
  for (let i = 0; i < steps; i++) {
    const q = (lo + hi) / 2;
    const size = await encode(q);
    if (size <= targetBytes) {
      best = { quality: q, size };
      lo = q; // cabe → intenta más calidad
    } else {
      hi = q; // no cabe → baja calidad
    }
  }
  return best;
}

/** % de reducción de tamaño (0 si no se redujo). */
export function reductionPercent(originalSize, newSize) {
  if (!originalSize) return 0;
  return Math.max(0, Math.round((1 - newSize / originalSize) * 100));
}

/** Nombre del fichero comprimido. */
export function compressedFileName(base, ext) {
  return `${base}-comprimida.${ext}`;
}
