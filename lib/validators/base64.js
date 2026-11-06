// Validador de Base64 — lógica pura (sin DOM ni red), testeable con Vitest.
// No usa ninguna librería: recorre el texto y localiza el primer carácter que rompe
// el formato (alfabeto, relleno `=` o longitud). Acepta el alfabeto estándar (+ /) y
// el URL-safe (- _), con o sin relleno, y saltos de línea (como en MIME).
// `scanBase64` también lo usa el validador de JWT, que exige URL-safe y sin relleno.
import { Located, normalizeLocated, runTextValidator } from "./run.js";

const WHITESPACE = /[ \t\r\n]/;
const DATA_URI = /^\s*data:[^,]*;base64,/i;

/** Todas las pistas que puede devolver validateBase64. */
export const BASE64_HINT_KEYS = [
  "empty", "badChar", "mixedAlphabet", "paddingMiddle", "badPadding", "badLength", "dataUri",
];

/**
 * Recorre `text` y devuelve { variant, padded, bytes } o lanza `Located`.
 * @param {string} text
 * @param {Object} [opts]
 * @param {boolean} [opts.urlOnly]  JWT: solo alfabeto URL-safe y nada de relleno ni espacios
 * @param {number} [opts.base]      desplazamiento de las posiciones (segmento dentro de otro texto)
 * @param {string} [opts.label]     de qué texto se trata, para los mensajes ("header"…)
 * @returns {{ variant: "standard"|"urlsafe"|"neutral", padded: boolean, bytes: Uint8Array }}
 */
export function scanBase64(text, { urlOnly = false, base = 0, label = "Input" } = {}) {
  let std = false;
  let url = false;
  let data = "";
  let lastEnd = base;
  let padStart = -1;
  let padCount = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const at = base + i;
    if (!urlOnly && WHITESPACE.test(c)) continue;
    if (c === "=") {
      if (urlOnly) throw new Located(`${label}: padding "=" is not allowed in Base64URL`, at, "notUrlSafe");
      if (padStart === -1) padStart = at;
      if (++padCount > 2) throw new Located(`${label}: too many "=" padding characters`, at, "badPadding");
      lastEnd = at + 1;
      continue;
    }
    // Un carácter ajeno al alfabeto es el fallo más concreto: se avisa antes que del relleno.
    if (!/[A-Za-z0-9+/\-_]/.test(c)) {
      throw new Located(`${label}: invalid character "${c}"`, at, "badChar", { params: { char: c } });
    }
    if (padStart !== -1) {
      throw new Located(`${label}: data after "=" padding`, padStart, "paddingMiddle");
    }
    if (/[A-Za-z0-9]/.test(c)) {
      data += c;
    } else if (c === "+" || c === "/") {
      if (urlOnly) throw new Located(`${label}: "${c}" is not Base64URL (use "${c === "+" ? "-" : "_"}")`, at, "notUrlSafe", { params: { char: c } });
      if (url) throw new Located(`${label}: "${c}" mixes the standard and URL-safe alphabets`, at, "mixedAlphabet", { params: { char: c } });
      std = true;
      data += c;
    } else if (c === "-" || c === "_") {
      if (std) throw new Located(`${label}: "${c}" mixes the standard and URL-safe alphabets`, at, "mixedAlphabet", { params: { char: c } });
      url = true;
      data += c;
    }
    lastEnd = at + 1;
  }

  if (data.length % 4 === 1) {
    throw new Located(`${label}: ${data.length} characters is not a valid Base64 length`, lastEnd, "badLength", { params: { length: data.length } });
  }
  if (padCount > 0 && (data.length + padCount) % 4 !== 0) {
    throw new Located(`${label}: wrong amount of "=" padding`, padStart, "badPadding");
  }

  const standard = data.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4));
  return {
    variant: std ? "standard" : url ? "urlsafe" : "neutral",
    padded: padCount > 0,
    bytes: Uint8Array.from(bin, (ch) => ch.charCodeAt(0)),
  };
}

/** ¿Los bytes son texto UTF-8 válido? */
export function isUtf8(bytes) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida Base64. meta: variante del alfabeto, si lleva relleno, nº de bytes y si
 * esos bytes son texto UTF-8.
 */
export function validateBase64(input) {
  return runTextValidator(input, {
    parse: (body) => {
      if (DATA_URI.test(body)) {
        throw new Located('Input starts with a "data:" URI prefix', 0, "dataUri");
      }
      const { variant, padded, bytes } = scanBase64(body);
      return { variant, padded, bytes: bytes.length, utf8: isUtf8(bytes) };
    },
    normalizeError: normalizeLocated,
    describe: (meta) => meta,
  });
}
