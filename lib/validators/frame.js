// Fragmento de código del error ("code frame"): la línea anterior, la línea del
// error y una marca ^ bajo la columna. Lógica pura (sin DOM). Sirve a cualquier
// validador y es una ayuda visual que no depende del color.
//
//   2 |   "a": 1,
//   3 | }
//       ^

const ELLIPSIS = "…";

/**
 * @param {string} text
 * @param {number} line    1-based
 * @param {number} column  1-based
 * @param {{ width?: number }} [opts]  ancho máximo de texto por línea
 * @returns {string} "" si la línea no existe
 */
export function buildCodeFrame(text, line, column, { width = 72 } = {}) {
  const lines = text.split("\n");
  if (!Number.isInteger(line) || line < 1 || line > lines.length) return "";
  const col = Number.isInteger(column) && column >= 1 ? column : 1;
  // Los tabuladores pasan a un espacio para que la marca ^ caiga bajo su carácter.
  const clean = (s) => s.replace(/\r$/, "").replace(/\t/g, " ");

  // Ventana horizontal: en líneas largas se recorta alrededor de la columna.
  const start = col > width - 10 ? col - Math.floor(width / 2) : 0;
  const lead = start > 0 ? ELLIPSIS : "";
  const clip = (s) => lead + s.slice(start, start + width) + (s.length > start + width ? ELLIPSIS : "");

  const shown = [];
  if (line > 1) shown.push(line - 1);
  shown.push(line);
  const digits = String(line).length;
  const rows = shown.map((n) => `${String(n).padStart(digits)} | ${clip(clean(lines[n - 1]))}`);
  const caret = " ".repeat(digits + 3 + lead.length + (col - 1 - start)) + "^";
  return [...rows, caret].join("\n");
}
