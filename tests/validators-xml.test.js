import { describe, it, expect } from "vitest";
import {
  findParserError,
  normalizeXmlError,
  parseParserErrorText,
  pickXmlHint,
  validateXml,
} from "../lib/validators/xml.js";

// Los textos de <parsererror> de Chrome son los que devuelve el DOMParser real de
// Chromium (capturados con una sonda). Los de Firefox están escritos a partir de
// su formato documentado y NO se han contrastado con un Firefox real. La
// validación contra el DOMParser real está en e2e/validators-engine.spec.mjs.
const chrome = (line, col, msg) =>
  `This page contains the following errors:error on line ${line} at column ${col}: ${msg}\nBelow is a rendering of the page up to the first error.`;
const firefox = (msg, line, col, src = "") =>
  `XML Parsing Error: ${msg}\nLocation: about:blank\nLine Number ${line}, Column ${col}:${src}\n-------^`;

describe("parseParserErrorText", () => {
  it("Chrome/Safari: mensaje y posición, sin el texto de relleno", () => {
    expect(parseParserErrorText(chrome(1, 11, "Opening and ending tag mismatch: b line 1 and a"))).toEqual({
      message: "Opening and ending tag mismatch: b line 1 and a",
      line: 1,
      column: 11,
      codePoints: true,
    });
  });

  it("Chrome pega 'Below is…' al mensaje sin salto de línea en algunos errores", () => {
    const raw = "This page contains the following errors:error on line 1 at column 1: Start tag expected, '<' not foundBelow is a rendering of the page up to the first error.";
    expect(parseParserErrorText(raw).message).toBe("Start tag expected, '<' not found");
  });

  it("Firefox: mensaje y posición en otra línea", () => {
    expect(parseParserErrorText(firefox("mismatched tag. Expected: </b>.", 1, 8, "<a><b></a>"))).toEqual({
      message: "mismatched tag. Expected: </b>.",
      line: 1,
      column: 8,
      codePoints: true,
    });
  });

  it("formato desconocido: conserva el texto y no inventa posición", () => {
    expect(parseParserErrorText("algo   raro\n pasó")).toEqual({
      message: "algo raro pasó",
      line: null,
      column: null,
      codePoints: false,
    });
  });
});

describe("normalizeXmlError · posición", () => {
  it("Chrome: pasa de línea/columna a offset", () => {
    const e = normalizeXmlError(chrome(1, 11, "Opening and ending tag mismatch: b line 1 and a"), "<a><b></a>");
    expect([e.offset, e.line, e.column]).toEqual([10, 1, 11]);
  });

  it("Chrome: varias líneas", () => {
    const text = "<root>\n  <a>\n    <b></c>\n  </a>\n</root>";
    const e = normalizeXmlError(chrome(3, 12, "Opening and ending tag mismatch: b line 3 and c"), text);
    expect([e.line, e.column]).toEqual([3, 12]);
    expect(e.offset).toBe(text.indexOf("</c>") + 4);
  });

  it("Chrome cuenta puntos de código: un emoji antes del error no desplaza la posición", () => {
    const text = "<a>ñ😀</a><b/>";
    const e = normalizeXmlError(chrome(1, 10, "Extra content at the end of the document"), text);
    expect(e.offset).toBe(text.indexOf("<b/>")); // 10 en UTF-16
    expect(e.column).toBe(11); // la columna se devuelve en UTF-16, como el editor
  });

  it("Firefox también cuenta puntos de código (contrastado: Column 10 para este texto)", () => {
    const text = "<a>ñ😀</a><b/>";
    const e = normalizeXmlError(firefox("junk after document element", 1, 10), text);
    expect(e.offset).toBe(10);
    expect(e.column).toBe(11);
  });

  it("posición fuera del texto → todo null (no se inventa)", () => {
    const e = normalizeXmlError(chrome(9, 1, "Extra content at the end of the document"), "<a/><b/>");
    expect([e.offset, e.line, e.column]).toEqual([null, null, null]);
  });

  it("sin posición → todo null", () => {
    const e = normalizeXmlError("XML Parsing Error: not well-formed", "<a>");
    expect([e.offset, e.line, e.column]).toEqual([null, null, null]);
  });
});

describe("normalizeXmlError · pista afinada con la posición (formatos reales de Firefox y WebKit)", () => {
  const hint = (raw, text) => normalizeXmlError(raw, text).hint;

  it("WebKit: «Extra content» justo al final del texto es una etiqueta sin cerrar", () => {
    expect(hint(chrome(1, 7, "Extra content at the end of the document"), "<a><b>")).toBe("unclosedTag");
    expect(hint(chrome(1, 7, "Extra content at the end of the document"), "<a><b>\n  \n")).toBe("unclosedTag");
  });

  it("«Extra content» donde empieza el contenido sobrante sigue siendo un segundo elemento raíz", () => {
    expect(hint(chrome(1, 5, "Extra content at the end of the document"), "<a/><b/>")).toBe("extraContent");
    expect(hint(firefox("junk after document element", 1, 5), "<a/><b/>")).toBe("extraContent");
  });

  it("Firefox «not well-formed»: por el carácter anterior al error", () => {
    expect(hint(firefox("not well-formed", 1, 10), "<a>fish & chips</a>")).toBe("unescapedAmpersand");
    expect(hint(firefox("not well-formed", 1, 7), "<a>1 < 2</a>")).toBe("unescapedLt");
    expect(hint(firefox("not well-formed", 1, 6), "<a b=1/>")).toBe("attributeQuotes");
  });

  it("«not well-formed» sin pista clara no inventa una", () => {
    expect(hint(firefox("not well-formed", 1, 3), "<a>x</a>")).toBeNull();
    expect(hint(firefox("not well-formed", 1, 1), "x")).toBeNull();
  });

  it("sin posición no se afina nada", () => {
    expect(hint("XML Parsing Error: not well-formed", "<a>fish & chips</a>")).toBeNull();
  });
});

describe("pickXmlHint", () => {
  const cases = [
    ["Opening and ending tag mismatch: b line 1 and a", "mismatchedTag"],
    ["mismatched tag. Expected: </b>.", "mismatchedTag"],
    ["Premature end of data in tag b line 1", "unclosedTag"],
    ["unclosed token", "unclosedTag"],
    ["Extra content at the end of the document", "extraContent"],
    ["junk after document element", "extraContent"],
    ["Start tag expected, '<' not found", "noRoot"],
    ["no root element found", "unclosedTag"], // Firefox: el texto termina con etiquetas sin cerrar
    ["syntax error", "noRoot"], // Firefox: el texto no es XML
    ["Document is empty", "noRoot"],
    ["xmlParseEntityRef: no name", "unescapedAmpersand"],
    ["StartTag: invalid element name", "unescapedLt"],
    ["Entity 'nbsp' not defined", "undefinedEntity"],
    ["undefined entity", "undefinedEntity"],
    ["AttValue: \" or ' expected", "attributeQuotes"],
    ["Attribute b redefined", "duplicateAttribute"],
    ["duplicate attribute", "duplicateAttribute"],
    ["XML declaration allowed only at the start of the document", "declPosition"],
    ["XML or text declaration not at start of entity", "declPosition"],
    ["algo que no conocemos", null],
  ];
  for (const [message, hint] of cases) {
    it(`${message} → ${hint}`, () => expect(pickXmlHint(message)).toBe(hint));
  }
});

// --- DOM falso con la API mínima que usa validateXml -------------------------

const NS_XHTML = "http://www.w3.org/1999/xhtml";
const NS_MOZ = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
const el = (name, attrs = 0, children = []) => ({ nodeName: name, attributes: { length: attrs }, children });
const goodDoc = (root) => ({ documentElement: root, getElementsByTagNameNS: () => [] });
const errorDoc = (ns, raw) => ({
  documentElement: null,
  getElementsByTagNameNS: (n, local) => (n === ns && local === "parsererror" ? [{ textContent: raw }] : []),
});
const parserReturning = (doc, seen = []) =>
  class {
    parseFromString(text, type) {
      seen.push([text, type]);
      return doc;
    }
  };

describe("findParserError", () => {
  it("detecta el <parsererror> de Chrome/Safari y el de Firefox", () => {
    expect(findParserError(errorDoc(NS_XHTML, "boom"))).toBe("boom");
    expect(findParserError(errorDoc(NS_MOZ, "boom"))).toBe("boom");
  });

  it("un documento sin error devuelve null", () => {
    expect(findParserError(goodDoc(el("a")))).toBeNull();
  });
});

describe("validateXml", () => {
  it("XML bien formado: valid, meta con raíz, elementos, atributos y profundidad", () => {
    const root = el("a", 0, [el("b", 2, [el("c")]), el("d")]);
    const r = validateXml("<a/>", parserReturning(goodDoc(root)));
    expect(r).toEqual({
      valid: true,
      errors: [],
      meta: { rootName: "a", elementCount: 4, attributeCount: 2, depth: 3, hadBom: false },
    });
  });

  it("un elemento llamado <parsererror> escrito por el usuario es XML válido", () => {
    const r = validateXml("<parsererror/>", parserReturning(goodDoc(el("parsererror"))));
    expect(r.valid).toBe(true);
    expect(r.meta.rootName).toBe("parsererror");
  });

  it("pide application/xml al parser", () => {
    const seen = [];
    validateXml("<a/>", parserReturning(goodDoc(el("a")), seen));
    expect(seen).toEqual([["<a/>", "application/xml"]]);
  });

  it("error de Chrome: invalid con posición, mensaje y pista", () => {
    const doc = errorDoc(NS_XHTML, chrome(1, 11, "Opening and ending tag mismatch: b line 1 and a"));
    const r = validateXml("<a><b></a>", parserReturning(doc));
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual([
      { message: "Opening and ending tag mismatch: b line 1 and a", offset: 10, line: 1, column: 11, hint: "mismatchedTag" },
    ]);
  });

  it("error de Firefox: misma forma de resultado", () => {
    const doc = errorDoc(NS_MOZ, firefox("mismatched tag. Expected: </b>.", 1, 8, "<a><b></a>"));
    const r = validateXml("<a><b></a>", parserReturning(doc));
    expect(r.errors[0]).toMatchObject({ offset: 7, line: 1, column: 8, hint: "mismatchedTag" });
  });

  it("entrada vacía o solo espacios: inválida con pista 'empty' y sin llamar al parser", () => {
    const seen = [];
    for (const input of ["", "  \n ", null, undefined, "﻿"]) {
      const r = validateXml(input, parserReturning(goodDoc(el("a")), seen));
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatchObject({ hint: "empty", offset: null });
    }
    expect(seen).toEqual([]);
  });

  it("BOM: se quita antes de parsear, se anota y las posiciones son del texto original", () => {
    const seen = [];
    const ok1 = validateXml("﻿<a/>", parserReturning(goodDoc(el("a")), seen));
    expect(ok1.meta.hadBom).toBe(true);
    expect(seen[0][0]).toBe("<a/>");

    const doc = errorDoc(NS_XHTML, chrome(1, 11, "Opening and ending tag mismatch: b line 1 and a"));
    const bad = validateXml("﻿<a><b></a>", parserReturning(doc));
    expect(bad.errors[0]).toMatchObject({ offset: 11, line: 1, column: 12 });
  });

  it("lanza un error claro si no hay DOMParser (Node)", () => {
    expect(() => validateXml("<a/>")).toThrow(/DOMParser/);
  });
});
