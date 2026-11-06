// JSON Pointer (RFC 6901) y su posición en el texto — lógica pura (sin DOM).
// Sirve para llevar un error de schema ("/usuarios/0/email") al punto exacto del
// documento. El índice se construye con un único recorrido iterativo del texto
// (no desborda con anidamiento profundo) y solo se usa con JSON ya validado.

const WS = new Set([" ", "\t", "\n", "\r"]);
const PUNCT = new Set(["{", "}", "[", "]", ",", ":"]);

export const escapePointer = (key) => String(key).replace(/~/g, "~0").replace(/\//g, "~1");
export const unescapePointer = (seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~");

/** Segmentos ya sin escapar: "/a~1b/0" → ["a/b", "0"]; "" → []. */
export function pointerSegments(pointer) {
  return pointer === "" ? [] : pointer.slice(1).split("/").map(unescapePointer);
}

/**
 * Convierte la ruta en formato de fragmento URI ("#/a~1b%20c") en un JSON Pointer
 * ("/a~1b c"). Las claves llegan ya escapadas con ~0 y ~1; solo hay que quitar el
 * porcentaje. Si el porcentaje es inválido se deja tal cual.
 */
export function fragmentToPointer(fragment) {
  const body = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  try {
    return decodeURIComponent(body);
  } catch {
    return body;
  }
}

/**
 * Índice ruta → posición de cada valor del documento.
 * @returns {Map<string, { start: number, keyStart: number | null }>}
 *   start: offset del valor; keyStart: offset de su clave si está en un objeto.
 */
export function buildPointerIndex(text) {
  const index = new Map();
  const stack = [];
  const n = text.length;
  let i = 0;

  const startValue = (at) => {
    const top = stack[stack.length - 1];
    let ptr = "";
    let keyStart = null;
    if (top) {
      if (top.kind === "a") ptr = `${top.ptr}/${top.count++}`;
      else { ptr = `${top.ptr}/${escapePointer(top.key)}`; keyStart = top.keyStart; }
    }
    index.set(ptr, { start: at, keyStart }); // con claves repetidas gana la última, como JSON.parse
    return ptr;
  };

  while (i < n) {
    const c = text[i];
    if (WS.has(c)) { i++; continue; }
    if (c === "{") { stack.push({ kind: "o", ptr: startValue(i), key: "", keyStart: null, expectKey: true }); i++; }
    else if (c === "[") { stack.push({ kind: "a", ptr: startValue(i), count: 0 }); i++; }
    else if (c === "}" || c === "]") { stack.pop(); i++; }
    else if (c === ",") {
      const top = stack[stack.length - 1];
      if (top && top.kind === "o") top.expectKey = true;
      i++;
    } else if (c === ":") { i++; }
    else if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      j++;
      const top = stack[stack.length - 1];
      if (top && top.kind === "o" && top.expectKey) {
        let key;
        try { key = JSON.parse(text.slice(i, j)); } catch { key = text.slice(i + 1, j - 1); }
        top.key = key;
        top.keyStart = i;
        top.expectKey = false;
      } else {
        startValue(i);
      }
      i = j;
    } else {
      startValue(i);
      while (i < n && !WS.has(text[i]) && !PUNCT.has(text[i])) i++;
    }
  }
  return index;
}

/**
 * Offset de `pointer` en el documento. `target`: "value" (inicio del valor) o "key"
 * (inicio de su clave, si la tiene). Si la ruta no existe sube al ancestro más
 * cercano que sí exista. null si no hay ninguno.
 */
export function locatePointer(index, pointer, target = "value") {
  let ptr = pointer;
  for (;;) {
    const hit = index.get(ptr);
    if (hit) return target === "key" && hit.keyStart != null ? hit.keyStart : hit.start;
    if (ptr === "") return null;
    ptr = ptr.slice(0, ptr.lastIndexOf("/"));
  }
}
