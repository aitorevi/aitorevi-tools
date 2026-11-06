// Validador de JWT — lógica pura (sin DOM ni red), testeable con Vitest.
// Comprueba la ESTRUCTURA del token firmado (JWS compacto): tres partes en Base64URL,
// header y payload que son un objeto JSON, un `alg` y las fechas `exp`/`nbf`/`iat`
// bien formadas. NO verifica la firma: eso exige la clave y no es lo que se pregunta
// aquí. Para ver el contenido o firmar, está la herramienta "JWT" (jwt/lib.js).
import { Located, normalizeLocated, runTextValidator } from "./run.js";
import { isUtf8, scanBase64 } from "./base64.js";

const MAX_MS = 8.64e15; // límite de Date: fuera de él toISOString() lanzaría

/** Pistas que puede devolver validateJwt. */
export const JWT_HINT_KEYS = [
  "empty", "bearerPrefix", "partsCount", "encrypted", "emptyPart", "badChar", "notUrlSafe",
  "badLength", "notUtf8", "notJson", "notObject", "noAlg", "missingSignature",
  "noneWithSignature", "claimType",
];

/** Avisos (el token es válido, pero conviene saberlo) que puede devolver validateJwt. */
export const JWT_NOTE_KEYS = ["expired", "notYetValid", "expBeforeIat", "algNone"];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Decodifica una parte Base64URL a objeto JSON o lanza `Located` sobre su inicio. */
function decodeObject(text, start, label) {
  if (text === "") throw new Located(`${label} is empty`, start, "emptyPart");
  const { bytes } = scanBase64(text, { urlOnly: true, base: start, label });
  if (!isUtf8(bytes)) throw new Located(`${label} is not valid UTF-8`, start, "notUtf8");
  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    throw new Located(`${label} is not valid JSON: ${e.message}`, start, "notJson");
  }
  if (!isPlainObject(value)) throw new Located(`${label} must be a JSON object`, start, "notObject");
  return value;
}

/** Fecha NumericDate (segundos) → ISO, o lanza `Located` si no es un número de fecha. */
function claimDate(payload, claim, start) {
  if (!(claim in payload)) return null;
  const seconds = payload[claim];
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || Math.abs(seconds * 1000) > MAX_MS) {
    throw new Located(`Claim "${claim}" must be a number of seconds (NumericDate)`, start, "claimType", { params: { claim } });
  }
  return { seconds, iso: new Date(seconds * 1000).toISOString() };
}

function parseJwt(body, now) {
  const start = body.length - body.trimStart().length;
  const token = body.trim();

  if (/^bearer\s/i.test(token)) {
    throw new Located('The token starts with "Bearer": that is the HTTP header, not part of the JWT', start, "bearerPrefix");
  }

  const parts = token.split(".");
  const starts = [];
  let at = start;
  for (const p of parts) { starts.push(at); at += p.length + 1; }

  if (parts.length === 5) {
    throw new Located("Five parts: this looks like an encrypted token (JWE), only signed tokens (JWS) are checked", start, "encrypted");
  }
  if (parts.length !== 3) {
    // Con de más, la posición es el primer punto sobrante; con de menos, el final.
    const offset = parts.length > 3 ? starts[3] - 1 : start + token.length;
    throw new Located(`Expected 3 parts separated by dots, found ${parts.length}`, offset, "partsCount", { params: { count: parts.length } });
  }

  const header = decodeObject(parts[0], starts[0], "Header");
  const payload = decodeObject(parts[1], starts[1], "Payload");

  if (typeof header.alg !== "string" || header.alg === "") {
    throw new Located('The header has no "alg" (signing algorithm)', starts[0], "noAlg");
  }

  const none = header.alg.toLowerCase() === "none";
  const signature = parts[2];
  if (none && signature !== "") {
    throw new Located('The algorithm is "none" but the token has a signature', starts[2], "noneWithSignature");
  }
  if (!none) {
    if (signature === "") throw new Located("The signature is empty", starts[2], "missingSignature");
    scanBase64(signature, { urlOnly: true, base: starts[2], label: "Signature" });
  }

  const exp = claimDate(payload, "exp", starts[1]);
  const nbf = claimDate(payload, "nbf", starts[1]);
  const iat = claimDate(payload, "iat", starts[1]);

  const notes = [];
  if (none) notes.push({ key: "algNone" });
  if (exp && exp.seconds * 1000 < now) notes.push({ key: "expired", params: { date: exp.iso } });
  if (nbf && nbf.seconds * 1000 > now) notes.push({ key: "notYetValid", params: { date: nbf.iso } });
  if (exp && iat && exp.seconds < iat.seconds) notes.push({ key: "expBeforeIat" });

  return {
    alg: header.alg,
    typ: typeof header.typ === "string" ? header.typ : null,
    exp: exp && exp.iso,
    nbf: nbf && nbf.iso,
    iat: iat && iat.iso,
    notes,
  };
}

/**
 * Valida la estructura de un JWT firmado. meta: alg, typ, exp, nbf, iat (ISO o null)
 * y avisos `notes` ([{ key, params }]: caducado, aún no válido…).
 * @param {string} input
 * @param {number} [now]  ms desde 1970; inyectable para que los tests no dependan del reloj
 */
export function validateJwt(input, now = Date.now()) {
  return runTextValidator(input, {
    parse: (body) => parseJwt(body, now),
    normalizeError: normalizeLocated,
    describe: (meta) => meta,
  });
}
