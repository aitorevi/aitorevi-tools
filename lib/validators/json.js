// Validador de JSON — lógica pura (sin DOM), testeable con Vitest.
// JSON.parse decide si es válido; aquí solo se normaliza su error nativo, que
// cambia entre motores:
//   Chrome/Node  "Expected ',' or '}' after property value in JSON at position 7 (line 1 column 8)"
//                "Unexpected token ']', "[1,2,]" is not valid JSON"        (sin posición)
//   Firefox      "JSON.parse: expected double-quoted property name at line 1 column 8 of the JSON data"
//   Safari       "JSON Parse error: Unexpected token '}'"                   (sin posición)
// Si el motor no da posición se busca con ./json-locate.js; si tampoco se puede
// (o el error no es de sintaxis) queda null: nunca se inventa.
import { makeError } from "./result.js";
import { lineColumnToOffset, offsetToLineColumn } from "./position.js";
import { capitalize, runTextValidator } from "./run.js";
import { locateJsonError } from "./json-locate.js";
import { describeValue } from "./describe.js";

/** Quita del mensaje nativo lo que varía por motor (posición, prefijo, fragmento). */
function cleanMessage(raw) {
  let m = raw.replace(/^JSON\.parse:\s*/, "").replace(/^JSON Parse error:\s*/, "");
  const token = m.match(/^(Unexpected token '[\s\S]'),[\s\S]* is not valid JSON$/);
  if (token) return token[1];
  m = m
    .replace(/\s*\(line \d+ column \d+\)/, "")
    .replace(/\s+in JSON at position \d+/, "")
    .replace(/\s+at position \d+/, "")
    .replace(/\s+at line \d+ column \d+ of the JSON data/, "")
    .trim();
  return capitalize(m);
}

/** Extrae el offset del mensaje nativo, o null si el motor no lo da. */
function extractOffset(raw, text) {
  // V8 incluye un fragmento del texto del usuario en este formato: puede
  // contener "at position 9" y no es una posición real. Aquí V8 no da posición.
  if (/ is not valid JSON$/.test(raw)) return null;
  let m = raw.match(/\bat position (\d+)/);
  if (m) return Number(m[1]);
  m = raw.match(/\bline (\d+) column (\d+)/);
  if (m) return lineColumnToOffset(text, Number(m[1]), Number(m[2]));
  return null;
}

/** Clasifica el error nativo en un tipo independiente del motor. */
function classify(raw) {
  if (/end of JSON input|end of data|Unexpected EOF/i.test(raw)) return "end";
  if (/unterminated string/i.test(raw)) return "unterminatedString";
  if (/control character/i.test(raw)) return "controlChar";
  if (/bad escape|bad unicode escape/i.test(raw)) return "badEscape";
  if (/expected ':'/i.test(raw)) return "missingColon";
  if (/expected ',' or/i.test(raw)) return "missingComma";
  if (/non-whitespace character after/i.test(raw)) return "extraContent";
  if (/property name/i.test(raw)) return "propertyName";
  return "token";
}

/** Todas las pistas que puede devolver la validación de sintaxis de JSON. */
export const JSON_HINT_KEYS = [
  "empty", "unexpectedEnd", "unterminatedString", "controlChar", "badEscape", "missingColon", "comments",
  "missingComma", "extraContent", "singleQuotes", "trailingComma", "unquotedKey", "nonJsonValue",
];

const prevNonSpace = (text, offset) => {
  for (let i = offset - 1; i >= 0; i--) if (!/\s/.test(text[i])) return text[i];
  return null;
};

/**
 * Clave de la pista para no técnicos, o null. Con posición mira el carácter que
 * falla; sin ella usa el carácter que nombra el motor ("Unexpected token ']'")
 * y exige que el texto tenga el patrón típico antes de aventurar la pista.
 */
function pickHint(kind, raw, text, offset) {
  if (kind === "end") return "unexpectedEnd";
  if (kind === "unterminatedString") return "unterminatedString";
  if (kind === "controlChar") return "controlChar";
  if (kind === "badEscape") return "badEscape";
  if (kind === "missingColon") return "missingColon";

  const known = offset != null && offset < text.length;
  const ch = known ? text[offset] : (raw.match(/^(?:JSON\.parse: |JSON Parse error: )?Unexpected token '?([\s\S])/) || [])[1];
  const rest = known ? text.slice(offset) : "";
  const isComment = known ? /^\/[/*]/.test(rest) : ch === "/" && /\/\/|\/\*/.test(text);

  if (isComment) return "comments";
  if (kind === "missingComma") return "missingComma";
  if (kind === "extraContent") return "extraContent";
  if (ch === "'") return "singleQuotes";
  if (ch === "}" || ch === "]") {
    const trailing = known ? prevNonSpace(text, offset) === "," : /,\s*[}\]]/.test(text);
    if (trailing) return "trailingComma";
  }
  if (kind === "propertyName" && ch && /[A-Za-z_$]/.test(ch)) return "unquotedKey";
  const nonJson = known ? /^(?:NaN|-?Infinity|undefined)/.test(rest) : /\b(?:NaN|Infinity|undefined)\b/.test(text);
  if (nonJson && ch && /[NIu-]/.test(ch)) return "nonJsonValue";
  return null;
}

/**
 * Normaliza el error nativo de JSON.parse a la forma común.
 * @param {unknown} error  excepción lanzada por JSON.parse
 * @param {string} text    el texto que se intentó parsear
 */
export function normalizeJsonError(error, text) {
  const raw = String((error && error.message) || error || "");
  let offset = extractOffset(raw, text);
  if (offset == null || offsetToLineColumn(text, offset) == null) {
    offset = error && error.name === "SyntaxError" ? locateJsonError(text) : null;
  }
  const pos = offset == null ? null : offsetToLineColumn(text, offset);
  return makeError(cleanMessage(raw), {
    offset,
    line: pos ? pos.line : null,
    column: pos ? pos.column : null,
    hint: pickHint(classify(raw), raw, text, offset),
  });
}

/**
 * Valida JSON. Acepta cualquier valor JSON en la raíz (42, "hola", null…) y un
 * BOM inicial (se ignora y se anota en meta.hadBom). Las posiciones del error
 * se refieren al texto original, BOM incluido.
 * @param {string} input
 */
export function validateJson(input) {
  return runTextValidator(input, {
    parse: (body) => JSON.parse(body),
    normalizeError: normalizeJsonError,
    describe: (value) => {
      const { rootType, keyCount, depth } = describeValue(value);
      return { rootType, keyCount, depth };
    },
  });
}
