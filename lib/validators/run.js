// Esqueleto común de los validadores de texto: BOM, entrada vacía, error del parser
// normalizado y posición recolocada sobre el texto original. Cada formato solo aporta
// cómo parsear, cómo normalizar su error y cómo describir lo parseado. Lógica pura.
import { fail, makeError, ok } from "./result.js";
import { offsetToLineColumn, restoreBomOffset, splitBom } from "./position.js";

/** Primera letra en mayúscula (los motores dan los mensajes en minúscula). */
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Error propio de un validador sin parser externo: ya sabe su posición, su pista y,
 * si hace falta, los valores de la pista. Se lanza desde `parse` y lo recoge
 * `normalizeLocated`.
 */
export class Located extends Error {
  constructor(message, offset, hint, extra = {}) {
    super(message);
    this.offset = offset;
    this.hint = hint;
    this.extra = extra;
  }
}

/** `normalizeError` para los validadores que lanzan `Located` (cualquier otro error se muestra sin posición). */
export function normalizeLocated(error, text) {
  if (!(error instanceof Located)) return makeError(String((error && error.message) || error));
  const pos = offsetToLineColumn(text, error.offset);
  return makeError(error.message, {
    offset: error.offset, line: pos.line, column: pos.column, hint: error.hint, ...error.extra,
  });
}

/**
 * @param {unknown} input  texto a validar (null/undefined cuentan como vacío)
 * @param {Object} fmt
 * @param {(body: string) => any} fmt.parse            parsea el texto sin BOM; lanza si es inválido
 * @param {(error: unknown, body: string) => Object} fmt.normalizeError  → error de la forma común
 * @param {(value: any) => Object} fmt.describe        meta del valor parseado (sin hadBom)
 */
export function runTextValidator(input, { parse, normalizeError, describe }) {
  const text = String(input == null ? "" : input);
  const { body, hadBom } = splitBom(text);

  if (body.trim() === "") return fail([makeError("Input is empty", { hint: "empty" })], { hadBom });

  let value;
  try {
    value = parse(body);
  } catch (e) {
    const err = normalizeError(e, body);
    return fail([hadBom ? restoreBomOffset(err, text) : err], { hadBom });
  }
  return ok({ ...describe(value), hadBom });
}
