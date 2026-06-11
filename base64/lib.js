// Base64 — lógica pura (sin DOM, sin red), testeable con Vitest. Codifica y
// decodifica texto UTF-8 ↔ Base64 con las primitivas nativas (btoa/atob +
// TextEncoder/TextDecoder), disponibles en el navegador y en Node.

/** Codifica texto (UTF-8) a Base64. */
export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(String(text == null ? "" : text));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Decodifica Base64 a texto (UTF-8). Lanza si no es Base64 o UTF-8 válido. */
export function decodeBase64(b64) {
  const s = String(b64 == null ? "" : b64).replace(/\s+/g, "");
  if (s === "") return "";
  let bin;
  try {
    bin = atob(s);
  } catch {
    throw new Error("La entrada no es Base64 válido.");
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("El resultado no es texto UTF-8 válido.");
  }
}

export const SAMPLE = "Hello, aitorevi 👋";
