import { describe, it, expect } from "vitest";
import { format, minify, SAMPLE } from "../formatear-xml/lib.js";

describe("format", () => {
  it("aplica sangría de 2 espacios al anidamiento", () => {
    expect(format("<a><b>x</b></a>")).toBe("<a>\n  <b>x</b>\n</a>");
  });

  it("deja <tag>texto</tag> en una sola línea", () => {
    expect(format("<a>hola</a>")).toBe("<a>hola</a>");
  });

  it("conserva atributos y etiquetas de autocierre", () => {
    expect(format('<root><item id="1"/><item id="2"/></root>')).toBe(
      '<root>\n  <item id="1"/>\n  <item id="2"/>\n</root>'
    );
  });

  it("respeta la declaración <?xml?>", () => {
    expect(format('<?xml version="1.0"?><a>x</a>')).toBe('<?xml version="1.0"?>\n<a>x</a>');
  });

  it("no se confunde con un '>' dentro de un atributo", () => {
    expect(format('<a title="x>y">z</a>')).toBe('<a title="x>y">z</a>');
  });

  it("es idempotente: format(format(x)) === format(x)", () => {
    const once = format(SAMPLE);
    expect(format(once)).toBe(once);
  });

  it("lanza un error controlado con XML mal formado", () => {
    expect(() => format("<a></b>")).toThrow();        // mal anidado
    expect(() => format("<a>")).toThrow();             // sin cerrar
    expect(() => format("<a><b></a></b>")).toThrow();  // cruce de etiquetas
    expect(() => format("")).toThrow();                // vacío
    expect(() => format("<a>texto")).toThrow();        // sin cerrar con texto
  });
});

describe("minify", () => {
  it("elimina los espacios entre etiquetas", () => {
    expect(minify("<a>\n  <b>x</b>\n</a>")).toBe("<a><b>x</b></a>");
  });

  it("lanza un error controlado con XML mal formado", () => {
    expect(() => minify("<a></b>")).toThrow();
  });
});

describe("round-trip", () => {
  it("format(minify(format(x))) === format(x)", () => {
    const pretty = format(SAMPLE);
    expect(format(minify(pretty))).toBe(pretty);
  });

  it("el SAMPLE es un XML válido", () => {
    expect(() => format(SAMPLE)).not.toThrow();
  });
});
