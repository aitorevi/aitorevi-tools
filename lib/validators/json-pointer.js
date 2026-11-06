// JSON Pointer (RFC 6901) y su posición en el texto — lógica pura (sin DOM).
// Sirve para llevar un error de schema ("/usuarios/0/email") al punto exacto del
// documento. El índice se construye con un único recorrido iterativo del texto
// (no desborda con anidamiento profundo) y solo se usa con JSON ya validado.

import { tokenizeJson } from "../json-tokens.js";

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

  for (const { s, at } of tokenizeJson(text)) {
    const top = stack[stack.length - 1];
    if (s === "{") stack.push({ kind: "o", ptr: startValue(at), key: "", keyStart: null, expectKey: true });
    else if (s === "[") stack.push({ kind: "a", ptr: startValue(at), count: 0 });
    else if (s === "}" || s === "]") stack.pop();
    else if (s === ",") { if (top && top.kind === "o") top.expectKey = true; }
    else if (s === ":") continue;
    else if (s[0] === '"' && top && top.kind === "o" && top.expectKey) {
      let key;
      try { key = JSON.parse(s); } catch { key = s.slice(1, -1); }
      top.key = key;
      top.keyStart = at;
      top.expectKey = false;
    } else startValue(at); // cadena, número o literal que es un valor
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
