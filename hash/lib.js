// Generador de hash — lógica pura (sin DOM, sin red), testeable con Vitest.
// Usa la Web Crypto API nativa (crypto.subtle), disponible en el navegador y en
// Node. Un hash es de un solo sentido: NO se puede revertir. format es asíncrono.

/** Algoritmos soportados por Web Crypto (SubtleCrypto). MD5 no está disponible. */
export const ALGORITHMS = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"];

/** Devuelve el hash hexadecimal del texto con el algoritmo indicado. */
export async function hashHex(text, algo) {
  const algorithm = ALGORITHMS.includes(algo) ? algo : "SHA-256";
  const data = new TextEncoder().encode(String(text == null ? "" : text));
  const buf = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SAMPLE = "aitorevi.tools";
