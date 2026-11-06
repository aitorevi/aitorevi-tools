import { describe, it, expect } from "vitest";
import { loadUMD } from "./_umd.js";
import { normalizeTomlError, pickTomlHint, validateToml } from "../lib/validators/toml.js";

const toml = loadUMD("vendor/smol-toml.min.js", "SmolTOML");
const run = (text) => validateToml(text, toml);

describe("validateToml · válido", () => {
  it("claves, tablas, tablas en línea y arrays de tablas", () => {
    const r = run('a = 1\n[t]\nb = {c = 2}\n[[l]]\nx = 1');
    expect(r).toEqual({
      valid: true,
      errors: [],
      meta: { keyCount: 6, tableCount: 3, depth: 3, hadBom: false },
    });
  });

  it("las fechas y horas son valores simples (no tablas)", () => {
    const r = run("d = 1979-05-27T07:32:00Z\nt = 07:32:00");
    expect(r.valid).toBe(true);
    expect(r.meta).toMatchObject({ keyCount: 2, tableCount: 0, depth: 1 });
  });

  it("un array de valores mixtos es válido en TOML 1.0", () => {
    expect(run("a = [1, 'x']").valid).toBe(true);
  });

  it("tablas anidadas: la raíz es el nivel 1", () => {
    expect(run("[a.b]\nc = 1").meta).toMatchObject({ keyCount: 3, tableCount: 2, depth: 3 });
  });
});

describe("validateToml · entrada vacía y BOM", () => {
  it("vacía, solo espacios, null, undefined o solo BOM → pista 'empty'", () => {
    for (const input of ["", "  \n", null, undefined, "\ufeff"]) {
      const r = run(input);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatchObject({ hint: "empty", offset: null });
    }
  });

  it("BOM inicial: válido, anotado, y las posiciones son del texto original", () => {
    expect(run("\ufeffa = 1").meta.hadBom).toBe(true);
    expect(run("\ufeffa = ").errors[0]).toMatchObject({ offset: 5, line: 1, column: 6, hint: "invalidValue" });
  });
});

describe("validateToml · errores con posición (smol-toml real)", () => {
  // [texto, offset, línea, columna, pista]
  const cases = [
    ["a = ", 4, 1, 5, "invalidValue"],
    ["a = hola", 4, 1, 5, "invalidValue"],
    ["a = 1\na = 2", 6, 2, 1, "duplicateKey"],
    ["[a]\n[a]", 5, 2, 2, "duplicateKey"],
    ['a = "x', 4, 1, 5, "unclosedString"],
    ["a = [1,", 4, 1, 5, "unclosedArray"],
    ["[a\nb = 1", 2, 1, 3, "illegalKey"],
    ["a 1", 2, 1, 3, "illegalKey"],
    ["= 1", 0, 1, 1, "incompleteKey"],
    ["[a", 1, 1, 2, "incompleteKey"],
    ["d = 2020-13-45", 4, 1, 5, "invalidDate"],
    ["a = 1 b = 2", 6, 1, 7, "oneEntryPerLine"],
    ["a = 01", 4, 1, 5, "leadingZero"],
    ["a = 1__0", 6, 1, 7, "badUnderscore"],
    ['a = "\\q"', 6, 1, 7, "badEscape"],
    // CRLF
    ["a = 1\r\nb = ", 11, 2, 5, "invalidValue"],
    // un emoji antes del error: las columnas de smol-toml son UTF-16
    ['s = "😀" x', 9, 1, 10, "oneEntryPerLine"],
  ];
  for (const [text, offset, line, column, hint] of cases) {
    it(`${JSON.stringify(text)} → línea ${line}, columna ${column} (${hint})`, () => {
      const r = run(text);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatchObject({ offset, line, column, hint });
      expect(r.errors[0].message.startsWith("Invalid TOML document")).toBe(false);
    });
  }
});

describe("normalizeTomlError", () => {
  it("sin line/column: no hay posición y no se inventa", () => {
    const e = normalizeTomlError(new Error("boom"), "a = 1");
    expect([e.offset, e.line, e.column]).toEqual([null, null, null]);
  });

  it("posición fuera del texto no se acepta", () => {
    const e = normalizeTomlError({ message: "Invalid TOML document: invalid value", line: 9, column: 1 }, "a = 1");
    expect(e.offset).toBeNull();
    expect(e.message).toBe("Invalid value");
  });
});

describe("pickTomlHint", () => {
  const cases = [
    ["unfinished string", "unclosedString"],
    ["unfinished array", "unclosedArray"],
    ["invalid value", "invalidValue"],
    ["trying to redefine an already defined table or value", "duplicateKey"],
    ["illegal character in key", "illegalKey"],
    ["unexpected end of key", "incompleteKey"],
    ["incomplete key-value: cannot find end of key", "incompleteKey"],
    ["invalid date", "invalidDate"],
    ["each key-value declaration must be followed by an end-of-line", "oneEntryPerLine"],
    ["illegal leading zero", "leadingZero"],
    ["illegal underscore", "badUnderscore"],
    ["unrecognised escape sequence", "badEscape"],
    ["algo que no conocemos", null],
  ];
  for (const [message, hint] of cases) it(`${message} → ${hint}`, () => expect(pickTomlHint(message)).toBe(hint));
});

describe("dependencia", () => {
  it("lanza un error claro si smol-toml no está disponible", () => {
    // El UMD deja SmolTOML como global en Node: se retira mientras se comprueba.
    const saved = globalThis.SmolTOML;
    delete globalThis.SmolTOML;
    try {
      expect(() => validateToml("a = 1", undefined)).toThrow(/smol-toml/);
    } finally {
      globalThis.SmolTOML = saved;
    }
  });
});
