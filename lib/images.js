// Helpers de imagen compartidos. Las funciones de Canvas usan el DOM en tiempo
// de ejecución (navegador); las puras (fitDimensions, etc.) se testean en Node.

/** ¿El fichero es una imagen? (por MIME o extensión). */
export function isImageFile(file) {
  return /^image\//i.test(file.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);
}

/** Nombre del fichero sin extensión (para renombrar la salida). */
export function baseNameNoExt(name) {
  return name.replace(/\.[^.]+$/, "").trim() || "imagen";
}

/** Extensión sugerida para un MIME de imagen. */
export function extForMime(mime) {
  return { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mime] || "img";
}

/**
 * Reduce (w,h) para que el lado mayor no supere `maxSide`. Pura/testeable.
 * Si maxSide es 0/undefined o ya cabe, devuelve las mismas.
 */
export function fitDimensions(w, h, maxSide) {
  if (!maxSide || (w <= maxSide && h <= maxSide)) return { w, h };
  const scale = maxSide / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

// ── DOM (navegador) ──────────────────────────────────────────────

/** Decodifica un File/Blob de imagen a un bitmap dibujable. */
export async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Dibuja un bitmap en un canvas del tamaño dado y lo devuelve. */
export function drawToCanvas(bitmap, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

/** Exporta un canvas a Blob con el MIME y la calidad indicados. */
export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob falló"))), type, quality)
  );
}
