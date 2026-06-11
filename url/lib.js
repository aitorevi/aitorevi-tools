// Codificar/decodificar URL — lógica pura (sin DOM, sin red), testeable con
// Vitest. Usa el percent-encoding nativo (encodeURIComponent/decodeURIComponent).

/** Codifica texto para usarlo en una URL (percent-encoding). */
export function encodeUrl(text) {
  return encodeURIComponent(String(text == null ? "" : text));
}

/** Decodifica percent-encoding. Lanza si hay una secuencia %XX inválida. */
export function decodeUrl(text) {
  try {
    return decodeURIComponent(String(text == null ? "" : text));
  } catch {
    throw new Error("Hay una secuencia %XX no válida.");
  }
}

export const SAMPLE = "hola mundo & más = símbolos/raros?";
