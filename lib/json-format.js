// Formatear y minificar JSON SIN alterar los datos — lógica pura (sin DOM).
// JSON.stringify(JSON.parse(x)) reescribe los valores: pierde precisión en enteros
// grandes (12345678901234567890 → 12345678901234567000), descarta claves
// duplicadas, convierte 1.0 en 1 y normaliza los escapes. Aquí el texto se parte
// en tokens y solo cambia el espacio en blanco entre ellos: cada número, cadena y
// literal se copia tal cual estaba. JSON.parse se usa únicamente para validar.

const PUNCT = new Set(["{", "}", "[", "]", ",", ":"]);
const SPACE = new Set([" ", "\t", "\n", "\r"]);

/** Parte un JSON ya validado en tokens: puntuación, cadenas y valores simples. */
function tokenize(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (SPACE.has(c)) { i++; continue; }
    if (PUNCT.has(c)) { tokens.push(c); i++; continue; }
    let j = i + 1;
    if (c === '"') {
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      j++;
    } else {
      while (j < n && !SPACE.has(text[j]) && !PUNCT.has(text[j])) j++;
    }
    tokens.push(text.slice(i, j));
    i = j;
  }
  return tokens;
}

/** Valida con JSON.parse (lanza SyntaxError) y devuelve los tokens. */
function tokensOf(text) {
  JSON.parse(text);
  return tokenize(text);
}

/**
 * Embellece con sangría, sin cambiar ningún valor. Lanza si el JSON es inválido.
 * Mismo estilo que JSON.stringify(v, null, indent): un elemento por línea,
 * "clave": valor, y {} / [] vacíos en una sola línea.
 * @param {string} text
 * @param {number} [indent=2]
 */
export function formatJson(text, indent = 2) {
  const tokens = tokensOf(text);
  const pad = " ".repeat(indent);
  const out = [];
  let depth = 0;
  const newline = () => out.push("\n" + pad.repeat(depth));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "{" || t === "[") {
      const close = t === "{" ? "}" : "]";
      if (tokens[i + 1] === close) { out.push(t + close); i++; continue; }
      out.push(t);
      depth++;
      newline();
    } else if (t === "}" || t === "]") {
      depth--;
      newline();
      out.push(t);
    } else if (t === ",") {
      out.push(",");
      newline();
    } else if (t === ":") {
      out.push(": ");
    } else {
      out.push(t);
    }
  }
  return out.join("");
}

/** Minifica quitando todo el espacio sobrante, sin cambiar ningún valor. Lanza si es inválido. */
export function minifyJson(text) {
  return tokensOf(text).join("");
}
