// Validador de YAML — lógica pura (sin DOM), testeable con Vitest.
// Usa js-yaml (la misma librería que el formateador y el conversor), inyectada:
// en el navegador es window.jsyaml (UMD vendorizado) y en los tests se carga el
// mismo UMD. Acepta varios documentos (`---`), que es YAML válido.
// js-yaml lanza YAMLException con `reason` y `mark` ({ line, column, position }).
import { makeError } from "./result.js";
import { lineColumnToOffset, offsetToLineColumn } from "./position.js";
import { capitalize, runTextValidator } from "./run.js";
import { describeValue } from "./describe.js";

const YAML_HINT_RULES = [
  [/tab characters must not be used in indentation/i, "tabIndent"],
  [/bad indentation/i, "badIndent"],
  [/duplicated mapping key/i, "duplicateKey"],
  [/within a (?:double|single) quoted scalar/i, "unclosedQuote"],
  [/within a flow collection/i, "unclosedFlow"],
  [/unidentified alias/i, "unknownAlias"],
  [/unknown (?:\w+ )?tag/i, "unknownTag"],
  [/end of the stream or a document separator is expected/i, "unexpectedContent"],
];
/** Todas las pistas que puede devolver pickYamlHint. */
export const YAML_HINT_KEYS = YAML_HINT_RULES.map(([, key]) => key);

/** Clave de la pista para no técnicos según el motivo de js-yaml, o null. */
export function pickYamlHint(reason) {
  const hit = YAML_HINT_RULES.find(([re]) => re.test(reason));
  return hit ? hit[1] : null;
}

/**
 * Normaliza la YAMLException a la forma común. La posición se recorta a
 * text.length por si el motor la diera pasada del final (js-yaml 4 lo hacía en los
 * errores de fin de texto; la 5 ya no, pero el recorte es inocuo).
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
  return runTextValidator(input, {
    parse: (body) => jsyaml.loadAll(body),
    normalizeError: normalizeYamlError,
    describe: (docs) => {
      const parts = docs.map(describeValue);
      return {
        documents: docs.length,
        rootType: parts[0] ? parts[0].rootType : "null",
        keyCount: parts.reduce((n, p) => n + p.keyCount, 0),
        depth: parts.reduce((n, p) => Math.max(n, p.depth), 0),
      };
    },
  });
}
