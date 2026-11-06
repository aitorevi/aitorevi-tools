// Posiciones en texto — compartido por todos los validadores (JSON, XML, YAML…).
// Convención: `offset` es 0-based en unidades UTF-16 (el mismo índice que usa
// `textarea.setSelectionRange`); `line` y `column` son 1-based. Solo `\n` cuenta
// como salto de línea, de modo que `\r\n` es un único salto (el `\r` queda al
// final de la línea anterior). Sin DOM ni red.

/** Convierte un offset en { line, column }. null si está fuera del texto. */
export function offsetToLineColumn(text, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return null;
  let line = 1;
  let lineStart = 0;
  for (let i = text.indexOf("\n"); i !== -1 && i < offset; i = text.indexOf("\n", i + 1)) {
    line++;
    lineStart = i + 1;
  }
  return { line, column: offset - lineStart + 1 };
}

/**
 * Convierte (line, column) 1-based en offset. null si la línea o columna no existen.
 * Con `codePoints` la columna cuenta puntos de código Unicode (como libxml2 en
 * Chrome/Safari) en vez de unidades UTF-16: un emoji ocupa 1 columna, no 2.
 */
export function lineColumnToOffset(text, line, column, { codePoints = false } = {}) {
  if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1) return null;
  let lineStart = 0;
  for (let n = 1; n < line; n++) {
    const nl = text.indexOf("\n", lineStart);
    if (nl === -1) return null;
    lineStart = nl + 1;
  }
  const nextNl = text.indexOf("\n", lineStart);
  const lineEnd = nextNl === -1 ? text.length : nextNl;
  let offset = lineStart;
  for (let c = 1; c < column; c++) {
    if (offset >= lineEnd) return null;
    offset += codePoints && text.codePointAt(offset) > 0xffff ? 2 : 1;
  }
  return offset <= lineEnd ? offset : null;
}

const BOM = "\ufeff";

/** Separa un BOM inicial: { body, hadBom }. Los parsers suelen rechazarlo. */
export function splitBom(text) {
  const hadBom = text.startsWith(BOM);
  return { body: hadBom ? text.slice(1) : text, hadBom };
}

/**
 * Pasa un error calculado sobre el texto sin BOM a posiciones del texto original
 * (BOM incluido). No hace nada si el error no tiene posición.
 */
export function restoreBomOffset(error, fullText) {
  if (error.offset == null) return error;
  const offset = error.offset + 1;
  const pos = offsetToLineColumn(fullText, offset);
  return { ...error, offset, line: pos.line, column: pos.column };
}
