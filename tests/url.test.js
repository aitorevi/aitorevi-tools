import { describe, it, expect } from "vitest";
import { encodeUrl, decodeUrl, SAMPLE } from "../url/lib.js";

describe("encodeUrl / decodeUrl", () => {
  it("codifica espacios, símbolos y acentos", () => {
    expect(encodeUrl("a b&c")).toBe("a%20b%26c");
    expect(encodeUrl("ñ")).toBe("%C3%B1");
  });

  it("ida y vuelta", () => {
    expect(decodeUrl(encodeUrl(SAMPLE))).toBe(SAMPLE);
  });

  it("lanza con una secuencia %XX inválida", () => {
    expect(() => decodeUrl("%ZZ")).toThrow();
    expect(() => decodeUrl("%")).toThrow();
  });
});
