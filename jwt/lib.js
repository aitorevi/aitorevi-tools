// Decodificador de JWT — lógica pura (sin DOM, sin red), testeable con Vitest.
// Decodifica (NO verifica la firma) las partes Base64URL de un JWT. atob y
// TextDecoder existen tanto en el navegador como en Node, así que no hay deps.

/** Decodifica una cadena Base64URL a texto UTF-8. Lanza si no es Base64 válido. */
export function base64UrlDecode(str) {
  let s = String(str == null ? "" : str).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s); // lanza si no es Base64
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decodifica un JWT en `{ header, payload, signature }`. NO verifica la firma.
 * Lanza un Error controlado si el token no tiene 3 partes o no es Base64URL/JSON.
 */
export function decodeJwt(token) {
  const t = String(token == null ? "" : token).trim();
  if (t === "") throw new Error("El token está vacío.");
  const parts = t.split(".");
  if (parts.length !== 3) {
    throw new Error("Un JWT debe tener tres partes separadas por puntos.");
  }
  let header, payload;
  try { header = JSON.parse(base64UrlDecode(parts[0])); }
  catch { throw new Error("El header no es Base64URL/JSON válido."); }
  try { payload = JSON.parse(base64UrlDecode(parts[1])); }
  catch { throw new Error("El payload no es Base64URL/JSON válido."); }
  return { header, payload, signature: parts[2] };
}

/** Convierte un timestamp UNIX (segundos) a ISO 8601; null si no es un número. */
export function unixToIso(seconds) {
  if (typeof seconds !== "number" || !isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/** ¿El token está expirado según `exp` (segundos)? null si no hay `exp`. */
export function isExpired(payload, nowMs = Date.now()) {
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000 < nowMs;
}

/** JWT de ejemplo (HS256) para precargar; la firma no se verifica. */
export const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFpdG9yIFJldmlyaWVnbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjoxNzE2MjQyNjIyfQ.firma-no-verificada";
