// Validador de IBAN — lógica pura (sin DOM ni red). Un IBAN por línea, con o sin los
// espacios de agrupación y en mayúsculas o minúsculas. Comprueba el código de país, su
// longitud y las cifras de control (módulo 97, ISO 13616). NO comprueba que la cuenta
// exista ni la estructura interna del BBAN de cada país.
import { lineError, runListValidator } from "./list.js";

/** Todas las pistas que puede devolver validateIbans. */
export const IBAN_HINT_KEYS = [
  "empty", "badChar", "tooShort", "badCountry", "badCheckDigits", "unknownCountry", "badLength", "badChecksum",
];

/** Longitud total del IBAN por país (registro SWIFT de IBAN). */
export const IBAN_LENGTHS = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21,
  CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27,
  GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26,
  IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24,
  ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24,
  TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

/** Resto de dividir entre 97 el IBAN reordenado, con cada letra como su número (A=10 … Z=35). */
function mod97(compact) {
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let rest = 0;
  for (const c of rearranged) {
    const n = /[0-9]/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const digit of n) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest;
}

function validateIbanLine(raw) {
  // `at[k]` es la posición, en el valor original, del k-ésimo carácter sin espacios.
  const at = [];
  let compact = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === " ") continue;
    if (!/[A-Za-z0-9]/.test(c)) return lineError(`Invalid character "${c}"`, i, "badChar", { char: c });
    compact += c.toUpperCase();
    at.push(i);
  }
  const pos = (k) => (k < at.length ? at[k] : raw.length);

  if (compact.length < 4) return lineError(`Too short: ${compact.length} characters`, raw.length, "tooShort", { length: compact.length });
  if (!/^[A-Z]{2}/.test(compact)) return lineError("The IBAN must start with a two-letter country code", 0, "badCountry");
  if (!/^[0-9]{2}$/.test(compact.slice(2, 4))) return lineError("The two characters after the country must be digits", pos(2), "badCheckDigits");

  const country = compact.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (!expected) return lineError(`Unknown country code "${country}"`, 0, "unknownCountry", { country });
  if (compact.length !== expected) {
    const index = compact.length > expected ? pos(expected) : raw.length;
    return lineError(`${country} IBANs have ${expected} characters, found ${compact.length}`, index, "badLength", { country, expected, length: compact.length });
  }
  if (mod97(compact) !== 1) return lineError("The check digits don't match", pos(2), "badChecksum");
  return { kind: country };
}

/** Valida una lista de IBAN (uno por línea). meta.breakdown cuenta por país. */
export function validateIbans(input) {
  return runListValidator(input, validateIbanLine);
}
