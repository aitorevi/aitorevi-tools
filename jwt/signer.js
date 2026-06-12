// Firma JWT con HMAC (HS256/HS384/HS512) usando Web Crypto API.
// Lógica pura sin DOM; recibe el payload como string JSON ya validado.

export const SIGN_ALGORITHMS = ['HS256', 'HS384', 'HS512'];
const ALG_HASH = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlBuf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Firma un JWT con HMAC.
 * @param {string} payloadStr  JSON string del payload (ya validado)
 * @param {string} secret      Clave secreta (string)
 * @param {string} algorithm   'HS256' | 'HS384' | 'HS512'
 * @returns {Promise<string>}  JWT firmado (header.payload.signature)
 */
export async function signJwt(payloadStr, secret, algorithm = 'HS256') {
  const hash = ALG_HASH[algorithm];
  if (!hash) throw new Error(`Algoritmo no soportado: ${algorithm}`);
  if (!secret) throw new Error('La clave secreta no puede estar vacía.');

  const header = { alg: algorithm, typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(payloadStr)}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64urlBuf(sig)}`;
}

export const SIGN_SAMPLE_PAYLOAD = JSON.stringify(
  { sub: '1234567890', name: 'Alice', iat: 1516239022 },
  null, 2,
);
export const SIGN_SAMPLE_SECRET = 'mi-clave-secreta';
