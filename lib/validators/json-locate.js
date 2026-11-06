// Localizador de respaldo para errores de JSON — lógica pura (sin DOM).
// JSON.parse decide si el texto es válido; esto solo busca DÓNDE falla cuando el
// motor no da posición (V8 en "Unexpected token…", Safari casi siempre). Recorre
// la gramática de RFC 8259 una vez, sin recursión (no desborda con anidamiento
// profundo) y devuelve el offset del primer carácter que no encaja:
//   - un carácter inesperado → su índice (igual que "at position N" de V8);
//   - texto que termina antes de tiempo → text.length;
//   - texto que la gramática da por válido → null (no se inventa una posición).

const WS = new Set([" ", "\t", "\n", "\r"]);
const LITERALS = { t: "true", f: "false", n: "null" };
const SIMPLE_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t"]);
const isDigit = (c) => c >= "0" && c <= "9";
const isHex = (c) => (c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");

// Los escáneres devuelven [índiceSiguiente, offsetDeError]; uno de los dos es null.
const next = (i) => [i, null];
const bad = (at) => [null, at];

/** Escanea un string que empieza en `i` (la comilla de apertura). */
function scanString(text, i) {
  const n = text.length;
  for (let j = i + 1; ; j++) {
    if (j >= n) return bad(n);
    const c = text[j];
    if (c === '"') return next(j + 1);
    if (c < " ") return bad(j); // carácter de control sin escapar
    if (c !== "\\") continue;
    const e = text[j + 1];
    if (e === undefined) return bad(n);
    if (SIMPLE_ESCAPES.has(e)) { j++; continue; }
    if (e !== "u") return bad(j + 1);
    for (let k = 2; k <= 5; k++) {
      const h = text[j + k];
      if (h === undefined) return bad(n);
      if (!isHex(h)) return bad(j + k);
    }
    j += 5;
  }
}

/** Escanea un número que empieza en `i`: -? (0|[1-9]\d*) (\.\d+)? ([eE][+-]?\d+)? */
function scanNumber(text, i) {
  const n = text.length;
  let j = i;
  const digits = () => {
    if (j >= n) return bad(n);
    if (!isDigit(text[j])) return bad(j);
    while (j < n && isDigit(text[j])) j++;
    return null;
  };
  if (text[j] === "-") j++;
  if (j >= n) return bad(n);
  if (text[j] === "0") j++;
  else if (text[j] >= "1" && text[j] <= "9") while (j < n && isDigit(text[j])) j++;
  else return bad(j);
  let err;
  if (text[j] === ".") { j++; if ((err = digits())) return err; }
  if (text[j] === "e" || text[j] === "E") {
    j++;
    if (text[j] === "+" || text[j] === "-") j++;
    if ((err = digits())) return err;
  }
  return next(j);
}

/** Escanea true / false / null que empiezan en `i`. */
function scanLiteral(text, i) {
  const word = LITERALS[text[i]];
  for (let k = 1; k < word.length; k++) {
    const c = text[i + k];
    if (c === undefined) return bad(text.length);
    if (c !== word[k]) return bad(i + k);
  }
  return next(i + word.length);
}

/**
 * Offset del primer error de sintaxis de `text`, o null si la gramática lo da
 * por válido.
 * @param {string} text
 * @returns {number | null}
 */
export function locateJsonError(text) {
  const n = text.length;
  const stack = []; // "o" objeto | "a" array abiertos
  // Estados: value, valueOrEnd (tras "["), keyOrEnd (tras "{"), key, colon, after.
  let state = "value";
  let i = 0;
  const finish = ([to, err]) => {
    if (err !== null) return err;
    i = to;
    state = "after";
    return null;
  };

  for (;;) {
    while (i < n && WS.has(text[i])) i++;
    if (i >= n) return state === "after" && stack.length === 0 ? null : n;
    const c = text[i];
    let err = null;

    if (state === "value" || state === "valueOrEnd") {
      if (state === "valueOrEnd" && c === "]") { stack.pop(); i++; state = "after"; }
      else if (c === "{") { stack.push("o"); i++; state = "keyOrEnd"; }
      else if (c === "[") { stack.push("a"); i++; state = "valueOrEnd"; }
      else if (c === '"') err = finish(scanString(text, i));
      else if (c === "-" || isDigit(c)) err = finish(scanNumber(text, i));
      else if (c in LITERALS) err = finish(scanLiteral(text, i));
      else return i;
    } else if (state === "keyOrEnd" && c === "}") {
      stack.pop(); i++; state = "after";
    } else if (state === "keyOrEnd" || state === "key") {
      if (c !== '"') return i;
      const [to, e] = scanString(text, i);
      if (e !== null) return e;
      i = to;
      state = "colon";
    } else if (state === "colon") {
      if (c !== ":") return i;
      i++;
      state = "value";
    } else {
      // after: un valor ya está completo
      const top = stack[stack.length - 1];
      if (top === undefined) return i; // contenido extra tras el valor raíz
      if (c === ",") { i++; state = top === "o" ? "key" : "value"; }
      else if (c === (top === "o" ? "}" : "]")) { stack.pop(); i++; }
      else return i;
    }
    if (err !== null) return err;
  }
}
