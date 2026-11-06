// Validador de YAML — lógica pura (sin DOM), testeable con Vitest.
// Usa js-yaml (la misma librería que el formateador y el conversor), inyectada:
// en el navegador es window.jsyaml (UMD vendorizado) y en los tests se carga el
// mismo UMD. Acepta varios documentos (`---`), que es YAML válido.
// js-yaml lanza YAMLException con `reason` y `mark` ({ line, column, position }).
import { fail, makeError, ok } from "./result.js";
import { lineColumnToOffset, offsetToLineColumn, restoreBomOffset, splitBom } from "./position.js";
import { describeValue } from "./describe.js";

/** Clave de la pista para no técnicos según el motivo de js-yaml, o null. */
export function pickYamlHint(reason) {
  const rules = [
    [/tab characters must not be used in indentation/i, "tabIndent"],
    [/bad indentation/i, "badIndent"],
    [/duplicated mapping key/i, "duplicateKey"],
    [/within a (?:double|single) quoted scalar/i, "unclosedQuote"],
    [/within a flow collection/i, "unclosedFlow"],
    [/unidentified alias/i, "unknownAlias"],
    [/unknown tag/i, "unknownTag"],
    [/end of the stream or a document separator is expected/i, "unexpectedContent"],
  ];
  const hit = rules.find(([re]) => re.test(reason));
  return hit ? hit[1] : null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Normaliza la YAMLException a la forma común. En los errores de fin de texto
 * js-yaml da una posición una unidad pasada del final (añade un salto de línea
 * interno): se recorta a text.length para no perderla.
 */
export function normalizeYamlError(error, text) {
  const reason = String((error && (error.reason || error.message)) || error).split("\n")[0];
  const mark = error && error.mark;
  let offset = null;
  if (mark && Number.isInteger(mark.position) && mark.position >= 0) {
    offset = Math.min(mark.position, text.length);
  } else if (mark && Number.isInteger(mark.line) && Number.isInteger(mark.column)) {
    offset = lineColumnToOffset(text, mark.line + 1, mark.column + 1);
  }
  const pos = offset == null ? null : offsetToLineColumn(text, offset);
  return makeError(capitalize(reason), {
    offset: pos ? offset : null,
    line: pos ? pos.line : null,
    column: pos ? pos.column : null,
    hint: pickYamlHint(reason),
  });
}

/**
 * Valida YAML. meta: documentos, tipo raíz (del primero), claves de todos los
 * documentos y profundidad máxima.
 * @param {string} input
 * @param {{ loadAll: Function }} [jsyaml]  js-yaml (por defecto window.jsyaml)
 */
export function validateYaml(input, jsyaml = globalThis.jsyaml) {
  if (!jsyaml || typeof jsyaml.loadAll !== "function") throw new Error("js-yaml is not available in this environment");
  const text = String(input == null ? "" : input);
  const { body, hadBom } = splitBom(text);

  if (body.trim() === "") return fail([makeError("Input is empty", { hint: "empty" })], { hadBom });

  let docs;
  try {
    docs = jsyaml.loadAll(body);
  } catch (e) {
    const err = normalizeYamlError(e, body);
    return fail([hadBom ? restoreBomOffset(err, text) : err], { hadBom });
  }
  const parts = docs.map(describeValue);
  return ok({
    documents: docs.length,
    rootType: parts[0] ? parts[0].rootType : "null",
    keyCount: parts.reduce((n, p) => n + p.keyCount, 0),
    depth: parts.reduce((n, p) => Math.max(n, p.depth), 0),
    hadBom,
  });
}
