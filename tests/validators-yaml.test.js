import { describe, it, expect } from "vitest";
import { loadUMD } from "./_umd.js";
import { normalizeYamlError, pickYamlHint, validateYaml } from "../lib/validators/yaml.js";

const jsyaml = loadUMD("vendor/js-yaml.min.js", "jsyaml");
const run = (text) => validateYaml(text, jsyaml);
const at = (r) => [r.errors[0].offset, r.errors[0].line, r.errors[0].column];

describe("validateYaml · válido", () => {
  it("mapa, lista y escalar suelto", () => {
    expect(run("a: 1\nb: [x, y]").valid).toBe(true);
    expect(run("- a\n- b: 1").valid).toBe(true);
    expect(run("hola").valid).toBe(true);
  });

  it("varios documentos (---) son YAML válido y se cuentan", () => {
    const r = run("a: 1\n---\nb: [1, 2]");
    expect(r).toEqual({
      valid: true,
      errors: [],
      meta: { documents: 2, rootType: "object", keyCount: 2, depth: 2, hadBom: false },
    });
  });

  it("anclas, alias y claves de mezcla (<<)", () => {
    const r = run("a: &x {k: 1}\nb:\n  <<: *x");
    expect(r.valid).toBe(true);
  });

  it("las fechas son valores simples", () => {
    expect(run("d: 2020-01-02").meta).toMatchObject({ keyCount: 1, depth: 1 });
  });

  it("meta: tipo raíz, claves y profundidad", () => {
    expect(run("a:\n  b:\n    - c: 1").meta).toMatchObject({ documents: 1, rootType: "object", keyCount: 3, depth: 4 });
    expect(run("- 1\n- 2").meta).toMatchObject({ rootType: "array", keyCount: 0, depth: 1 });
    expect(run("hola").meta).toMatchObject({ rootType: "string", depth: 0 });
  });

  it("un archivo solo con comentarios es válido (un documento nulo)", () => {
    const r = run("# solo comentario");
    expect(r.valid).toBe(true);
    expect(r.meta.rootType).toBe("null");
  });
});

describe("validateYaml · entrada vacía y BOM", () => {
  it("vacía, solo espacios, null, undefined o solo BOM → pista 'empty'", () => {
    for (const input of ["", "  \n", null, undefined, "\ufeff"]) {
      const r = run(input);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatchObject({ hint: "empty", offset: null });
    }
  });

  it("BOM inicial: válido, anotado, y las posiciones son del texto original", () => {
    expect(run("\ufeffa: 1").meta.hadBom).toBe(true);
    const r = run("\ufeffa:\n\tb: 1");
    expect(at(r)).toEqual([4, 2, 1]); // sin BOM era el offset 3
    expect(r.errors[0].hint).toBe("tabIndent");
  });
});

describe("validateYaml · errores con posición (js-yaml real)", () => {
  // [texto, offset, línea, columna, pista]
  const cases = [
    ["a:\n\tb: 1", 3, 2, 1, "tabIndent"],
    ["a:\n  b: 1\n c: 2", 11, 3, 2, "badIndent"],
    ["a: b: c", 4, 1, 5, "badIndent"],
    ["a: 1\na: 2", 5, 2, 1, "duplicateKey"],
    ["a: 1\n---\nc: 1\nc: 2", 14, 4, 1, "duplicateKey"],
    ["a: *x", 4, 1, 5, "unknownAlias"],
    ["a: !!foo 1", 3, 1, 4, "unknownTag"],
    ["- a\nb: 1", 4, 2, 1, "unexpectedContent"],
    ["a: 1\n---\nb: : 2", 12, 3, 4, "badIndent"],
    // CRLF: js-yaml conserva los offsets del texto original
    ["a: 1\r\nb:\r\n\tc: 2", 10, 3, 1, "tabIndent"],
  ];
  for (const [text, offset, line, column, hint] of cases) {
    it(`${JSON.stringify(text)} → línea ${line}, columna ${column} (${hint})`, () => {
      const r = run(text);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatchObject({ offset, line, column, hint });
      expect(r.errors[0].message.length).toBeGreaterThan(0);
    });
  }

  it("en errores de fin de texto la posición queda en el final", () => {
    const quote = 'a: "hola';
    expect(run(quote).errors[0]).toMatchObject({ offset: quote.length, line: 1, column: 9, hint: "unclosedQuote" });
    const flow = "a: [1, 2";
    expect(run(flow).errors[0]).toMatchObject({ offset: flow.length, line: 1, column: 9, hint: "unclosedFlow" });
  });

  it("un emoji antes del error no desplaza la posición (UTF-16)", () => {
    const text = "e: 😀\nb: [1";
    expect(run(text).errors[0]).toMatchObject({ offset: text.length, line: 2, column: 6 });
  });
});

describe("normalizeYamlError", () => {
  it("sin mark: no hay posición y no se inventa", () => {
    const e = normalizeYamlError(new Error("algo raro"), "a: 1");
    expect([e.offset, e.line, e.column]).toEqual([null, null, null]);
    expect(e.message).toBe("Algo raro");
  });

  it("mark sin position: usa línea/columna (0-based)", () => {
    const e = normalizeYamlError({ reason: "bad indentation of a mapping entry", mark: { line: 1, column: 2 } }, "a: 1\nb: 2");
    expect([e.offset, e.line, e.column]).toEqual([7, 2, 3]);
  });

  it("posición fuera del texto no se acepta", () => {
    const e = normalizeYamlError({ reason: "x", mark: { line: 9, column: 0 } }, "a: 1");
    expect(e.offset).toBeNull();
  });
});

describe("pickYamlHint", () => {
  const cases = [
    ["tab characters must not be used in indentation", "tabIndent"],
    ["bad indentation of a mapping entry", "badIndent"],
    ["bad indentation of a sequence entry", "badIndent"],
    ["duplicated mapping key", "duplicateKey"],
    ["unexpected end of the stream within a double quoted scalar", "unclosedQuote"],
    ["unexpected end of the stream within a single quoted scalar", "unclosedQuote"],
    ["unexpected end of the stream within a flow collection", "unclosedFlow"],
    ['unidentified alias "x"', "unknownAlias"],
    ["unknown tag !<tag:yaml.org,2002:foo>", "unknownTag"],
    ["end of the stream or a document separator is expected", "unexpectedContent"],
    ["algo que no conocemos", null],
  ];
  for (const [reason, hint] of cases) it(`${reason} → ${hint}`, () => expect(pickYamlHint(reason)).toBe(hint));
});

describe("dependencia", () => {
  it("lanza un error claro si js-yaml no está disponible", () => {
    expect(() => validateYaml("a: 1", undefined)).toThrow(/js-yaml/);
  });
});
