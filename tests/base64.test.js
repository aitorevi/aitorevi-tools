import { describe, it, expect } from "vitest";
import { encodeBase64, decodeBase64, SAMPLE } from "../base64/lib.js";

describe("encodeBase64 / decodeBase64", () => {
  it("codifica texto ASCII", () => {
    expect(encodeBase64("Hello")).toBe("SGVsbG8=");
  });

  it("ida y vuelta con UTF-8 (emoji, acentos, CJK)", () => {
    expect(decodeBase64(encodeBase64(SAMPLE))).toBe(SAMPLE);
    const s = "áéíóú ñ 你好 👋";
    expect(decodeBase64(encodeBase64(s))).toBe(s);
  });

  it("tolera espacios y saltos al decodificar", () => {
    expect(decodeBase64("SGVs bG8=\n")).toBe("Hello");
  });

  it("entrada vacía → cadena vacía", () => {
    expect(encodeBase64("")).toBe("");
    expect(decodeBase64("")).toBe("");
  });

  it("lanza con Base64 inválido", () => {
    expect(() => decodeBase64("@@@no-base64@@@")).toThrow();
  });
});
