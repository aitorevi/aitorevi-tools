import { describe, it, expect } from "vitest";
import { lineColumnToOffset, offsetToLineColumn } from "../lib/validators/position.js";

describe("offsetToLineColumn", () => {
  it("línea única: line 1, column = offset + 1", () => {
    expect(offsetToLineColumn('{"a":1}', 0)).toEqual({ line: 1, column: 1 });
    expect(offsetToLineColumn('{"a":1}', 5)).toEqual({ line: 1, column: 6 });
  });

  it("varias líneas", () => {
    const text = "ab\ncde\nf";
    expect(offsetToLineColumn(text, 2)).toEqual({ line: 1, column: 3 }); // el propio \n
    expect(offsetToLineColumn(text, 3)).toEqual({ line: 2, column: 1 });
    expect(offsetToLineColumn(text, 7)).toEqual({ line: 3, column: 1 });
  });

  it("acepta el offset igual a la longitud (final del texto)", () => {
    expect(offsetToLineColumn("ab\ncd", 5)).toEqual({ line: 2, column: 3 });
  });

  it("\\r\\n cuenta como un único salto", () => {
    expect(offsetToLineColumn("a\r\nb", 3)).toEqual({ line: 2, column: 1 });
  });

  it("devuelve null fuera de rango o con valores no enteros", () => {
    expect(offsetToLineColumn("abc", -1)).toBeNull();
    expect(offsetToLineColumn("abc", 4)).toBeNull();
    expect(offsetToLineColumn("abc", 1.5)).toBeNull();
    expect(offsetToLineColumn("abc", NaN)).toBeNull();
  });
});

describe("lineColumnToOffset", () => {
  it("es la inversa de offsetToLineColumn", () => {
    const text = "ab\ncde\n\nf";
    for (let offset = 0; offset <= text.length; offset++) {
      const { line, column } = offsetToLineColumn(text, offset);
      expect(lineColumnToOffset(text, line, column)).toBe(offset);
    }
  });

  it("devuelve null si la línea no existe", () => {
    expect(lineColumnToOffset("ab\ncd", 3, 1)).toBeNull();
  });

  it("devuelve null si la columna se sale de su línea", () => {
    expect(lineColumnToOffset("ab\ncd", 1, 4)).toBeNull(); // la línea 1 llega hasta la columna 3 (\n)
    expect(lineColumnToOffset("ab\ncd", 2, 4)).toBeNull();
  });

  it("devuelve null con line/column inválidos", () => {
    expect(lineColumnToOffset("abc", 0, 1)).toBeNull();
    expect(lineColumnToOffset("abc", 1, 0)).toBeNull();
    expect(lineColumnToOffset("abc", 1.5, 1)).toBeNull();
  });
});
