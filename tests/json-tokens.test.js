import { describe, it, expect } from "vitest";
import { tokenizeJson } from "../lib/json-tokens.js";

describe("tokenizeJson", () => {
  it("puntuación, cadenas y valores simples con su posición", () => {
    expect(tokenizeJson('{"a": [1, true, null]}')).toEqual([
      { s: "{", at: 0 }, { s: '"a"', at: 1 }, { s: ":", at: 4 }, { s: "[", at: 6 }, { s: "1", at: 7 },
      { s: ",", at: 8 }, { s: "true", at: 10 }, { s: ",", at: 14 }, { s: "null", at: 16 },
      { s: "]", at: 20 }, { s: "}", at: 21 },
    ]);
  });

  it("copia cada token tal cual, sin reinterpretarlo", () => {
    const toks = tokenizeJson('[12345678901234567890, 1.0, -0, 1E+2, "caf\\u00e9 \\" ,:{}"]').map((t) => t.s);
    expect(toks).toEqual(["[", "12345678901234567890", ",", "1.0", ",", "-0", ",", "1E+2", ",", '"caf\\u00e9 \\" ,:{}"', "]"]);
  });

  it("ignora el espacio en blanco y no lo cuenta como token", () => {
    expect(tokenizeJson("  \n\t[ ]\r\n").map((t) => t.s)).toEqual(["[", "]"]);
  });

  it("texto vacío → sin tokens", () => {
    expect(tokenizeJson("")).toEqual([]);
  });
});
