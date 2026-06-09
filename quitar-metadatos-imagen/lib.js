// Quitar metadatos de imagen — elimina EXIF/GPS/XMP de JPG y metadatos de PNG,
// SIN re-comprimir (los píxeles quedan idénticos). Lógica pura y testeable.

export { isImageFile, baseNameNoExt } from "../lib/images.js";
export { triggerDownload, formatBytes } from "../lib/files.js";

function toBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/**
 * Elimina los segmentos APP1..APP15 (EXIF, XMP, IPTC…) y los comentarios de un
 * JPEG, conservando APP0 (JFIF) y los datos de imagen. No re-comprime.
 */
export function stripJpegMetadata(input) {
  const d = toBytes(input);
  if (d[0] !== 0xff || d[1] !== 0xd8) throw new Error("No es un JPEG válido");
  const keep = [[0, 2]]; // SOI
  let i = 2;
  while (i + 3 < d.length) {
    if (d[i] !== 0xff) break;
    const marker = d[i + 1];
    if (marker === 0xda) {
      keep.push([i, d.length]); // SOS + datos comprimidos hasta el final
      break;
    }
    const len = (d[i + 2] << 8) | d[i + 3];
    const seg = 2 + len;
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe; // APP1..15, COM
    if (!drop) keep.push([i, i + seg]);
    i += seg;
  }
  return concat(d, keep);
}

const PNG_META_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

/** Elimina los chunks de metadatos de un PNG (tEXt, zTXt, iTXt, eXIf, tIME). */
export function stripPngMetadata(input) {
  const d = toBytes(input);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (d[i] !== sig[i]) throw new Error("No es un PNG válido");
  const keep = [[0, 8]];
  let i = 8;
  while (i + 8 <= d.length) {
    const len = (d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3];
    const type = String.fromCharCode(d[i + 4], d[i + 5], d[i + 6], d[i + 7]);
    const chunk = 12 + len; // length(4) + type(4) + data + crc(4)
    if (!PNG_META_CHUNKS.has(type)) keep.push([i, i + chunk]);
    i += chunk;
    if (type === "IEND") break;
  }
  return concat(d, keep);
}

/** Detecta el tipo y elimina los metadatos. Devuelve { bytes, removed }. */
export function stripMetadata(input, type = "") {
  const d = toBytes(input);
  const isPng = /png/i.test(type) || (d[0] === 0x89 && d[1] === 0x50);
  const isJpeg = /jpe?g/i.test(type) || (d[0] === 0xff && d[1] === 0xd8);
  if (isPng) return finalize(d, stripPngMetadata(d));
  if (isJpeg) return finalize(d, stripJpegMetadata(d));
  throw new Error("Solo se admiten imágenes JPG y PNG");
}

function finalize(original, cleaned) {
  return { bytes: cleaned, removed: original.length - cleaned.length };
}

function concat(src, ranges) {
  let total = 0;
  for (const [a, b] of ranges) total += b - a;
  const out = new Uint8Array(total);
  let off = 0;
  for (const [a, b] of ranges) {
    out.set(src.subarray(a, b), off);
    off += b - a;
  }
  return out;
}

/** Nombre del fichero limpio. */
export function cleanedFileName(base, ext) {
  return `${base}-sin-metadatos.${ext}`;
}
