import { describe, it, expect } from "vitest";
import { format, minify, SAMPLE } from "../formatear-json/lib.js";

describe("format", () => {
  it("embellece con sangría de 2 espacios", () => {
    expect(format('{"a":1,"b":[2,3]}')).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it("es idempotente: format(format(x)) === format(x)", () => {
    const once = format(SAMPLE);
    expect(format(once)).toBe(once);
  });

  it("acepta valores JSON sueltos (números, strings, arrays)", () => {
    expect(format("42")).toBe("42");
    expect(format('"hola"')).toBe('"hola"');
    expect(format("[1,2]")).toBe("[\n  1,\n  2\n]");
  });

  it("lanza un error controlado con JSON inválido", () => {
    expect(() => format("{a:1}")).toThrow();
    expect(() => format("")).toThrow();
    expect(() => format("{ no cierra")).toThrow();
  });
});

describe("minify", () => {
  it("elimina los espacios sobrantes", () => {
    expect(minify('{\n  "a": 1,\n  "b": [ 2, 3 ]\n}')).toBe('{"a":1,"b":[2,3]}');
  });

  it("lanza un error controlado con JSON inválido", () => {
    expect(() => minify("{a:1}")).toThrow();
  });
});

describe("round-trip", () => {
  it("format(minify(format(x))) === format(x)", () => {
    const pretty = format(SAMPLE);
    expect(format(minify(pretty))).toBe(pretty);
  });

  it("el SAMPLE es un JSON válido", () => {
    expect(() => format(SAMPLE)).not.toThrow();
  });
});

describe("sin alterar los datos", () => {
  const source = '{"id":12345678901234567890,"x":1.0,"x":2,"e":"caf\\u00e9"}';

  it("format conserva enteros grandes, claves duplicadas, 1.0 y escapes", () => {
    const out = format(source);
    for (const piece of ["12345678901234567890", '"x": 1.0', '"x": 2', "caf\\u00e9"]) {
      expect(out).toContain(piece);
    }
  });

  it("minify devuelve el texto original sin espacios, valor a valor", () => {
    expect(minify(source)).toBe(source);
    expect(minify(format(source))).toBe(source);
  });
});
