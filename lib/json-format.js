// Formatear y minificar JSON SIN alterar los datos — lógica pura (sin DOM).
// JSON.stringify(JSON.parse(x)) reescribe los valores: pierde precisión en enteros
// grandes (12345678901234567890 → 12345678901234567000), descarta claves
// duplicadas, convierte 1.0 en 1 y normaliza los escapes. Aquí el texto se parte
// en tokens y solo cambia el espacio en blanco entre ellos: cada número, cadena y
// literal se copia tal cual estaba. JSON.parse se usa únicamente para validar.
import { tokenizeJson } from "./json-tokens.js";

/** Valida con JSON.parse (lanza SyntaxError) y devuelve los tokens. */
function tokensOf(text) {
  JSON.parse(text);
  return tokenizeJson(text).map((t) => t.s);
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
