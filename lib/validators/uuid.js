// Validador de UUID — lógica pura (sin DOM ni red). Un UUID por línea, en la forma
// canónica 8-4-4-4-12 (mayúsculas o minúsculas). Comprueba también la versión (1–8) y
// la variante RFC 9562 (8, 9, a, b); el UUID nulo y el máximo son válidos.
import { lineError, runListValidator } from "./list.js";

/** Todas las pistas que puede devolver validateUuids. */
export const UUID_HINT_KEYS = [
  "empty", "wrapped", "noHyphens", "badHyphen", "badChar", "tooShort", "tooLong", "badVersion", "badVariant",
];
/** Tipos que cuenta el recuento (versiones, más el nulo y el máximo). */
export const UUID_KINDS = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "nil", "max"];

const HYPHENS = [8, 13, 18, 23];
const HEX = /^[0-9a-fA-F]$/;

function validateUuidLine(value) {
  if (/^urn:uuid:/i.test(value) || value[0] === "{" || value[0] === "(") {
    return lineError("The UUID is wrapped in a prefix or braces", 0, "wrapped");
  }
  if (/^[0-9a-f]{32}$/i.test(value)) return lineError("The UUID has no hyphens", 8, "noHyphens");

  const scanned = Math.min(value.length, 36);
  for (let i = 0; i < scanned; i++) {
    const c = value[i];
    if (HYPHENS.includes(i)) {
      if (c !== "-") return lineError(`Expected "-" at position ${i + 1}`, i, "badHyphen");
    } else if (c === "-") {
      return lineError(`Unexpected "-" at position ${i + 1}`, i, "badHyphen");
    } else if (!HEX.test(c)) {
      return lineError(`Invalid character "${c}"`, i, "badChar", { char: c });
    }
  }
  if (value.length < 36) return lineError(`Too short: ${value.length} of 36 characters`, value.length, "tooShort", { length: value.length });
  if (value.length > 36) return lineError(`Too long: ${value.length} of 36 characters`, 36, "tooLong", { length: value.length });

  const hex = value.replace(/-/g, "").toLowerCase();
  if (/^0+$/.test(hex)) return { kind: "nil" };
  if (/^f+$/.test(hex)) return { kind: "max" };

  const version = value[14];
  if (!/[1-8]/.test(version)) return lineError(`Invalid version "${version}"`, 14, "badVersion", { char: version });
  const variant = value[19];
  if (!/[89abAB]/.test(variant)) return lineError(`Invalid variant "${variant}"`, 19, "badVariant", { char: variant });
  return { kind: `v${version}` };
}

/** Valida una lista de UUID (uno por línea). meta.breakdown cuenta por versión. */
export function validateUuids(input) {
  return runListValidator(input, validateUuidLine);
}
