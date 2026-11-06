// Esqueleto común de los validadores de lista (UUID, NIF/CIF/NIE, IBAN…): un valor por
// línea, cada uno validado por separado. Devuelve TODOS los errores (uno por línea que
// falla) con su línea, columna y offset sobre el texto original, y un recuento por tipo.
// Cada formato solo aporta cómo validar un valor. Lógica pura.
import { fail, makeError, ok } from "./result.js";
import { splitBom } from "./position.js";

/**
 * @param {unknown} input  texto con un valor por línea (null/undefined cuentan como vacío)
 * @param {(value: string) => ({ kind: string } | { error: { message: string, index?: number, hint: string, params?: Object } })} validateLine
 *        recibe el valor ya recortado; `index` es la posición del fallo dentro de ese valor
 *        (sin `index`, el primer carácter)
 * @returns resultado común; meta: { total, valid, invalid, breakdown: { [kind]: n }, hadBom }
 */
export function runListValidator(input, validateLine) {
  const text = String(input == null ? "" : input);
  const { body, hadBom } = splitBom(text);
  if (body.trim() === "") return fail([makeError("Input is empty", { hint: "empty" })], { hadBom });

  const base = hadBom ? 1 : 0; // los offsets cuentan el BOM, como el textarea
  const errors = [];
  const breakdown = {};
  let total = 0;

  let lineStart = 0;
  for (let line = 1; lineStart <= body.length; line++) {
    let end = body.indexOf("\n", lineStart);
    if (end === -1) end = body.length;
    const raw = body.slice(lineStart, end);
    const value = raw.trim();
    if (value !== "") {
      total++;
      const result = validateLine(value);
      if (result.error) {
        const lead = raw.length - raw.trimStart().length;
        const column = lead + (result.error.index || 0) + 1;
        errors.push(makeError(result.error.message, {
          line, column, offset: base + lineStart + column - 1,
          hint: result.error.hint, params: result.error.params, value,
        }));
      } else {
        breakdown[result.kind] = (breakdown[result.kind] || 0) + 1;
      }
    }
    lineStart = end + 1;
  }

  const meta = { total, valid: total - errors.length, invalid: errors.length, breakdown, hadBom };
  return errors.length ? fail(errors, meta) : ok(meta);
}

/** Atajo para los validadores de línea: un fallo en `index` con su pista y parámetros. */
export const lineError = (message, index, hint, params) => ({ error: { message, index, hint, ...(params && { params }) } });
