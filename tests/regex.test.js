import { describe, it, expect } from "vitest";
import {
  buildRegex,
  findMatches,
  highlightHtml,
  SAMPLE_PATTERN,
  SAMPLE_FLAGS,
  SAMPLE_TEXT,
} from "../regex/lib.js";

describe("findMatches", () => {
  it("encuentra todas las coincidencias con sus índices", () => {
    const ms = findMatches("\\d+", "g", "a1 b22 c333");
    expect(ms.map((m) => m.match)).toEqual(["1", "22", "333"]);
    expect(ms[1].index).toBe(4);
  });

  it("respeta la flag i (insensible a mayúsculas)", () => {
    expect(findMatches("abc", "i", "xxABCxx")).toHaveLength(1);
    expect(findMatches("abc", "", "xxABCxx")).toHaveLength(0);
  });

  it("devuelve los grupos de captura", () => {
    expect(findMatches("(\\w)(\\d)", "g", "a1 b2")[0].groups).toEqual(["a", "1"]);
  });

  it("no se cuelga con coincidencias vacías", () => {
    expect(Array.isArray(findMatches("a*", "g", "aa b"))).toBe(true);
  });

  it("encuentra los dos correos del SAMPLE", () => {
    expect(findMatches(SAMPLE_PATTERN, SAMPLE_FLAGS, SAMPLE_TEXT)).toHaveLength(2);
  });

  it("lanza con un patrón inválido", () => {
    expect(() => findMatches("(", "", "x")).toThrow();
  });
});

describe("highlightHtml", () => {
  it("envuelve las coincidencias en <mark> y escapa el HTML", () => {
    const text = "a <b> 1";
    const html = highlightHtml(text, findMatches("\\d", "g", text));
    expect(html).toBe("a &lt;b&gt; <mark>1</mark>");
  });

  it("sin coincidencias devuelve el texto escapado", () => {
    expect(highlightHtml("<x>", [])).toBe("&lt;x&gt;");
  });
});

describe("buildRegex", () => {
  it("descarta las flags no válidas", () => {
    expect(buildRegex("a", "gzx").flags).toBe("g");
  });

  it("lanza con un patrón inválido", () => {
    expect(() => buildRegex("(", "")).toThrow();
  });
});
