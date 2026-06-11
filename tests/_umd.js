// Carga un UMD vendorizado como CommonJS dentro de Vitest (el repo es
// `type: module`, así que no se puede `require` un .js suelto). Se evalúa el
// fichero pasándole module/exports/self/window y se devuelve la API resultante.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadUMD(relPath, globalName) {
  const code = readFileSync(join(ROOT, relPath), "utf8");
  const m = { exports: {} };
  globalThis.self = globalThis;
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", "self", "window", code)(m, m.exports, globalThis, globalThis);
  if (m.exports && (m.exports.format || m.exports.load)) return m.exports;
  return globalThis[globalName];
}
