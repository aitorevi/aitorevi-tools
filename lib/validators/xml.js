// Validador de XML — lógica pura (sin DOM propio), testeable con Vitest.
// Comprueba que el XML está BIEN FORMADO (etiquetas cerradas y anidadas, atributos
// con comillas, un único elemento raíz…); no valida contra un esquema XSD/DTD.
// Usa DOMParser con "application/xml", que NO lanza: devuelve un documento con un
// nodo <parsererror> cuyo contenido cambia entre motores:
//   Chrome/Safari (libxml2)  "…error on line 1 at column 11: Opening and ending tag mismatch: b line 1 and a…"
//   Firefox                  "XML Parsing Error: mismatched tag. Expected: </b>.\nLocation: …\nLine Number 1, Column 8:…"
// El DOMParser se inyecta (en el navegador es window.DOMParser) para poder probar
// la lógica sin DOM; Node no lo trae.
import { fail, makeError, ok } from "./result.js";
import { lineColumnToOffset, offsetToLineColumn, restoreBomOffset, splitBom } from "./position.js";

// <parsererror> propio de cada motor. Un elemento <parsererror> escrito por el
// usuario no tiene espacio de nombres, así que no se confunde con un error.
const PARSER_ERROR_NAMESPACES = [
  "http://www.w3.org/1999/xhtml", // Chrome, Safari
  "http://www.mozilla.org/newlayout/xml/parsererror.xml", // Firefox
];

/** Texto del nodo <parsererror> del motor, o null si el documento se parseó bien. */
export function findParserError(doc) {
  for (const ns of PARSER_ERROR_NAMESPACES) {
    const node = doc.getElementsByTagNameNS(ns, "parsererror")[0];
    if (node) return node.textContent || "";
  }
  return null;
}

/**
 * Extrae mensaje y posición del texto de <parsererror>.
 * `codePoints` indica que la columna cuenta puntos de código (libxml2) y no
 * unidades UTF-16. Si no hay posición, line/column quedan null.
 */
export function parseParserErrorText(raw) {
  // Chrome/Safari: la columna va en puntos de código Unicode.
  let m = raw.match(/error on line (\d+) at column (\d+):\s*([^\n]*)/);
  if (m) {
    const message = m[3].replace(/\s*Below is a rendering of the page up to the first error\.?\s*$/, "").trim();
    return { message, line: Number(m[1]), column: Number(m[2]), codePoints: true };
  }
  // Firefox: la posición va en otra línea y cuenta unidades UTF-16.
  m = raw.match(/XML Parsing Error:\s*([^\n]*)/);
  if (m) {
    const pos = raw.match(/Line Number (\d+), Column (\d+)/);
    return {
      message: m[1].trim(),
      line: pos ? Number(pos[1]) : null,
      column: pos ? Number(pos[2]) : null,
      codePoints: false,
    };
  }
  return { message: raw.replace(/\s+/g, " ").trim().slice(0, 200), line: null, column: null, codePoints: false };
}

/** Clave de la pista para no técnicos según el mensaje del motor, o null. */
export function pickXmlHint(message) {
  const rules = [
    [/XML declaration allowed only at the start|declaration not at start of entity/i, "declPosition"],
    [/mismatch/i, "mismatchedTag"],
    [/Premature end of data|unclosed token|Couldn't find end of Start Tag|EndTag: '<\/' not found/i, "unclosedTag"],
    [/Extra content at the end|junk after document element/i, "extraContent"],
    [/Start tag expected|no root element|Document is empty/i, "noRoot"],
    [/xmlParseEntityRef: no name|EntityRef: expecting ';'/i, "unescapedAmpersand"],
    [/StartTag: invalid element name/i, "unescapedLt"],
    [/Entity '.*' not defined|undefined entity/i, "undefinedEntity"],
    [/AttValue: " or ' expected|Specification mandates value for attribute/i, "attributeQuotes"],
    [/Attribute .* redefined|duplicate attribute/i, "duplicateAttribute"],
  ];
  const hit = rules.find(([re]) => re.test(message));
  return hit ? hit[1] : null;
}

/** Normaliza el texto de <parsererror> a la forma común. */
export function normalizeXmlError(raw, text) {
  const { message, line, column, codePoints } = parseParserErrorText(raw);
  const offset = line == null ? null : lineColumnToOffset(text, line, column, { codePoints });
  // Línea y columna se recalculan desde el offset para que sean siempre UTF-16,
  // la misma unidad que usa el editor, venga el error de donde venga.
  const pos = offset == null ? null : offsetToLineColumn(text, offset);
  return makeError(message, {
    offset: pos ? offset : null,
    line: pos ? pos.line : null,
    column: pos ? pos.column : null,
    hint: pickXmlHint(message),
  });
}

/** Nombre del elemento raíz, nº de elementos y atributos y profundidad máxima (iterativo). */
function describe(root) {
  let elementCount = 0;
  let attributeCount = 0;
  let depth = 0;
  const stack = [[root, 1]];
  while (stack.length) {
    const [el, d] = stack.pop();
    elementCount++;
    attributeCount += el.attributes.length;
    if (d > depth) depth = d;
    for (const child of el.children) stack.push([child, d + 1]);
  }
  return { rootName: root.nodeName, elementCount, attributeCount, depth };
}

/**
 * Valida que `input` es XML bien formado. Un BOM inicial se ignora y se anota en
 * meta.hadBom; las posiciones se refieren al texto original.
 * @param {string} input
 * @param {{ new(): { parseFromString(text: string, type: string): any } }} [DOMParserImpl]
 */
export function validateXml(input, DOMParserImpl = globalThis.DOMParser) {
  if (typeof DOMParserImpl !== "function") throw new Error("DOMParser is not available in this environment");
  const text = String(input == null ? "" : input);
  const { body, hadBom } = splitBom(text);

  if (body.trim() === "") return fail([makeError("Input is empty", { hint: "empty" })], { hadBom });

  const doc = new DOMParserImpl().parseFromString(body, "application/xml");
  const raw = findParserError(doc);
  if (raw !== null) {
    const err = normalizeXmlError(raw, body);
    return fail([hadBom ? restoreBomOffset(err, text) : err], { hadBom });
  }
  return ok({ ...describe(doc.documentElement), hadBom });
}
