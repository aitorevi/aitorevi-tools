// Troceado de un JSON ya validado en tokens con su posición — lógica pura, compartida
// por el formateador (lib/json-format.js) y el índice de rutas
// (lib/validators/json-pointer.js). No valida: se usa solo con JSON correcto.
// Cada token es la puntuación ({ } [ ] , :), una cadena entera (empieza por ") o un
// valor simple (número, true, false, null), tal cual aparece en el texto.

const PUNCT = new Set(["{", "}", "[", "]", ",", ":"]);
const SPACE = new Set([" ", "\t", "\n", "\r"]);

/** @returns {Array<{ s: string, at: number }>} s: texto del token; at: su offset */
export function tokenizeJson(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (SPACE.has(c)) { i++; continue; }
    if (PUNCT.has(c)) { tokens.push({ s: c, at: i }); i++; continue; }
    let j = i + 1;
    if (c === '"') {
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      j++;
    } else {
      while (j < n && !SPACE.has(text[j]) && !PUNCT.has(text[j])) j++;
    }
    tokens.push({ s: text.slice(i, j), at: i });
    i = j;
  }
  return tokens;
}
