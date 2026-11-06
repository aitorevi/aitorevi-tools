// Validador de NIF / NIE / CIF españoles — lógica pura (sin DOM ni red). Uno por línea,
// sin separadores (12345678Z, no 12.345.678-Z), en mayúsculas o minúsculas. Comprueba la
// forma y el carácter de control, pero NO que el número exista ni esté asignado.
//   · DNI/NIF: 8 cifras + letra (el resto de dividir el número entre 23).
//   · NIE: X, Y o Z + 7 cifras + letra (X, Y, Z valen 0, 1, 2).
//   · NIF especial (K, L, M): letra + 7 cifras + letra, con la misma cuenta del DNI.
//   · CIF: letra de entidad + 7 cifras + control (cifra o letra según la entidad).
import { lineError, runListValidator } from "./list.js";

/** Todas las pistas que puede devolver validateNifs. */
export const NIF_HINT_KEYS = [
  "empty", "badChar", "separator", "tooShort", "tooLong", "badStart", "badShape", "badControl",
];
/** Tipos que cuenta el recuento. */
export const NIF_KINDS = ["dni", "nie", "special", "cif"];

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_LETTERS = "JABCDEFGHI";
const CIF_ENTITIES = "ABCDEFGHJNPQRSUVW";
const LETTER_ONLY = "PQRSNW"; // el control de estas entidades es siempre una letra
const DIGIT_ONLY = "ABEH"; //   y el de estas, siempre una cifra

const dniLetter = (digits) => DNI_LETTERS[Number(digits) % 23];

/** Control del CIF: suma de las cifras pares + las impares duplicadas (sumando sus cifras). */
function cifControl(digits) {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) { const x = d * 2; sum += Math.floor(x / 10) + (x % 10); } else sum += d;
  }
  const digit = (10 - (sum % 10)) % 10;
  return { digit: String(digit), letter: CIF_LETTERS[digit] };
}

/** Primera posición (desde `from`) hasta `to` (excluida) que no es una cifra, o -1. */
const firstNonDigit = (v, from, to) => {
  for (let i = from; i < to; i++) if (!/[0-9]/.test(v[i])) return i;
  return -1;
};

function validateNifLine(raw) {
  const v = raw.toUpperCase();
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (/[A-Z0-9]/.test(c)) continue;
    return /[-. /]/.test(c)
      ? lineError(`Separator "${c}": write it without separators`, i, "separator", { char: c })
      : lineError(`Invalid character "${c}"`, i, "badChar", { char: c });
  }
  if (v.length < 9) return lineError(`Too short: ${v.length} of 9 characters`, v.length, "tooShort", { length: v.length });
  if (v.length > 9) return lineError(`Too long: ${v.length} of 9 characters`, 9, "tooLong", { length: v.length });

  const first = v[0];
  const kind = /[0-9]/.test(first) ? "dni" : "XYZ".includes(first) ? "nie" : "KLM".includes(first) ? "special"
    : CIF_ENTITIES.includes(first) ? "cif" : null;
  if (!kind) return lineError(`Invalid first character "${first}"`, 0, "badStart", { char: first });

  // Las cifras del número: en el DNI son las 8 primeras; en el resto, las 7 tras la letra.
  const bad = firstNonDigit(v, kind === "dni" ? 0 : 1, 8);
  if (bad !== -1) return lineError(`Expected a digit at position ${bad + 1}`, bad, "badShape", { char: v[bad] });

  const control = v[8];
  let expected;
  let ok;
  if (kind === "cif") {
    const { digit, letter } = cifControl(v.slice(1, 8));
    if (LETTER_ONLY.includes(first)) { expected = letter; ok = control === letter; }
    else if (DIGIT_ONLY.includes(first)) { expected = digit; ok = control === digit; }
    else { expected = `${digit} / ${letter}`; ok = control === digit || control === letter; }
  } else {
    const digits = kind === "dni" ? v.slice(0, 8) : kind === "nie" ? `${"XYZ".indexOf(first)}${v.slice(1, 8)}` : v.slice(1, 8);
    expected = dniLetter(digits);
    ok = control === expected;
  }
  return ok ? { kind } : lineError(`Wrong control character: expected ${expected}`, 8, "badControl", { expected });
}

/** Valida una lista de NIF/NIE/CIF (uno por línea). meta.breakdown cuenta por tipo. */
export function validateNifs(input) {
  return runListValidator(input, validateNifLine);
}
