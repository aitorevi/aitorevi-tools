// Validador de TOML — lógica pura (sin DOM), testeable con Vitest.
// Usa smol-toml (la misma librería que el conversor), inyectada: en el navegador
// es window.SmolTOML (UMD vendorizado) y en los tests se carga el mismo UMD.
// smol-toml lanza un Error con `line` y `column` (1-based, en unidades UTF-16).
import { fail, makeError, ok } from "./result.js";
import { lineColumnToOffset, offsetToLineColumn, restoreBomOffset, splitBom } from "./position.js";
import { describeValue } from "./describe.js";

/** Clave de la pista para no técnicos según el mensaje de smol-toml, o null. */
export function pickTomlHint(message) {
  const rules = [
    [/unfinished string/i, "unclosedString"],
    [/unfinished array/i, "unclosedArray"],
    [/invalid value/i, "invalidValue"],
    [/redefine an already defined/i, "duplicateKey"],
    [/illegal character in key/i, "illegalKey"],
    [/unexpected end of key|cannot find end of key/i, "incompleteKey"],
    [/invalid date/i, "invalidDate"],
    [/must be followed by an end-of-line/i, "oneEntryPerLine"],
    [/illegal leading zero/i, "leadingZero"],
    [/illegal underscore/i, "badUnderscore"],
    [/unrecognised escape sequence/i, "badEscape"],
  ];
  const hit = rules.find(([re]) => re.test(message));
  return hit ? hit[1] : null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Normaliza el error de smol-toml a la forma común. */
export function normalizeTomlError(error, text) {
  const first = String((error && error.message) || error).split("\n")[0];
  const message = first.replace(/^Invalid TOML document:\s*/, "");
  const offset = error && Number.isInteger(error.line) && Number.isInteger(error.column)
    ? lineColumnToOffset(text, error.line, error.column)
    : null;
  const pos = offset == null ? null : offsetToLineColumn(text, offset);
  return makeError(capitalize(message), {
    offset: pos ? offset : null,
    line: pos ? pos.line : null,
    column: pos ? pos.column : null,
    hint: pickTomlHint(message),
  });
}

/**
 * Valida TOML. meta: claves de todas las tablas, nº de tablas (la raíz no cuenta)
 * y profundidad máxima (la raíz es el nivel 1).
 * @param {string} input
 * @param {{ parse: Function }} [toml]  smol-toml (por defecto window.SmolTOML)
 */
export function validateToml(input, toml = globalThis.SmolTOML) {
  if (!toml || typeof toml.parse !== "function") throw new Error("smol-toml is not available in this environment");
  const text = String(input == null ? "" : input);
  const { body, hadBom } = splitBom(text);

  if (body.trim() === "") return fail([makeError("Input is empty", { hint: "empty" })], { hadBom });

  let value;
  try {
    value = toml.parse(body);
  } catch (e) {
    const err = normalizeTomlError(e, body);
    return fail([hadBom ? restoreBomOffset(err, text) : err], { hadBom });
  }
  const { keyCount, objectCount, depth } = describeValue(value);
  return ok({ keyCount, tableCount: objectCount - 1, depth, hadBom });
}
