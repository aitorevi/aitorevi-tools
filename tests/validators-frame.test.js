import { describe, it, expect } from "vitest";
import { buildCodeFrame } from "../lib/validators/frame.js";

describe("buildCodeFrame", () => {
  it("línea única: la línea y la marca bajo la columna", () => {
    expect(buildCodeFrame('{"a":1,}', 1, 8)).toBe('1 | {"a":1,}\n           ^');
  });

  it("con línea anterior, numeradas y alineadas", () => {
    const text = '{\n  "a": 1,\n}';
    expect(buildCodeFrame(text, 3, 1)).toBe('2 |   "a": 1,\n3 | }\n    ^');
  });

  it("la marca cae bajo el carácter indicado", () => {
    const text = '{\n  "a": 1,\n}';
    const frame = buildCodeFrame(text, 2, 3).split("\n");
    expect(frame[frame.length - 1].indexOf("^")).toBe(frame[frame.length - 2].indexOf('"a"'));
  });

  it("alinea con números de línea de varios dígitos", () => {
    const text = Array.from({ length: 12 }, (_, i) => `l${i + 1}`).join("\n");
    expect(buildCodeFrame(text, 10, 2)).toBe(" 9 | l9\n10 | l10\n      ^");
  });

  it("los tabuladores no desalinean la marca", () => {
    expect(buildCodeFrame("\t\tx", 1, 3)).toBe("1 |   x\n      ^");
  });

  it("ignora el \\r de \\r\\n", () => {
    expect(buildCodeFrame("ab\r\ncd", 1, 1)).toBe("1 | ab\n    ^");
  });

  it("recorta las líneas largas alrededor de la columna, con la marca alineada", () => {
    const long = "x".repeat(300) + "ERR" + "y".repeat(300);
    const frame = buildCodeFrame(long, 1, long.indexOf("ERR") + 1, { width: 40 }).split("\n");
    expect(frame[0].startsWith("1 | …")).toBe(true);
    expect(frame[0].endsWith("…")).toBe(true);
    expect(frame[0].length).toBeLessThan(60);
    expect(frame[0][frame[1].indexOf("^")]).toBe("E");
  });

  it("columna ausente o inválida → primera columna", () => {
    expect(buildCodeFrame("abc", 1, null)).toBe("1 | abc\n    ^");
  });

  it("devuelve '' si la línea no existe", () => {
    expect(buildCodeFrame("abc", 2, 1)).toBe("");
    expect(buildCodeFrame("abc", null, 1)).toBe("");
    expect(buildCodeFrame("abc", 0, 1)).toBe("");
  });
});
