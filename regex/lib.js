// Tester de regex — lógica pura (sin DOM, sin red), testeable con Vitest.
// Usa el motor RegExp nativo del navegador/Node. Sin dependencias.

const VALID_FLAGS = /[^gimsuy]/g;

/** Compila una RegExp validando patrón y flags. Lanza un Error si son inválidos. */
export function buildRegex(pattern, flags) {
  return new RegExp(String(pattern == null ? "" : pattern), String(flags || "").replace(VALID_FLAGS, ""));
}

/**
 * Encuentra TODAS las coincidencias del patrón en el texto (fuerza el flag `g`
 * para iterar, respetando i/m/s/u/y). Devuelve `[{ match, index, groups }]`.
 * Lanza si el patrón o las flags son inválidos.
 */
export function findMatches(pattern, flags, text) {
  const userFlags = String(flags || "").replace(VALID_FLAGS, "");
  const enumFlags = userFlags.includes("g") ? userFlags : userFlags + "g";
  const re = new RegExp(String(pattern == null ? "" : pattern), enumFlags);
  const src = String(text == null ? "" : text);
  const out = [];
  let m;
  let guard = 0;
  while ((m = re.exec(src)) !== null) {
    out.push({ match: m[0], index: m.index, groups: m.slice(1) });
    if (m.index === re.lastIndex) re.lastIndex++; // evita bucles con matches vacíos
    if (++guard > 100000) break;
  }
  return out;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/** Devuelve el texto con las coincidencias (no vacías) envueltas en <mark>. */
export function highlightHtml(text, matches) {
  const src = String(text == null ? "" : text);
  if (!matches || !matches.length) return escapeHtml(src);
  let html = "";
  let pos = 0;
  for (const m of matches) {
    if (m.match.length === 0 || m.index < pos) continue;
    html += escapeHtml(src.slice(pos, m.index));
    html += `<mark>${escapeHtml(src.slice(m.index, m.index + m.match.length))}</mark>`;
    pos = m.index + m.match.length;
  }
  html += escapeHtml(src.slice(pos));
  return html;
}

export const SAMPLE_PATTERN = "[\\w.+-]+@[\\w-]+\\.[\\w.-]+";
export const SAMPLE_FLAGS = "gi";
export const SAMPLE_TEXT =
  "Escribe a hola@aitorevi.dev o a Soporte@Example.COM.\nLas demás líneas no tienen ningún correo electrónico.";
