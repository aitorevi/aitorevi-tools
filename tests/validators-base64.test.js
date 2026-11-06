import { describe, it, expect } from "vitest";
import { BASE64_HINT_KEYS, isUtf8, scanBase64, validateBase64 } from "../lib/validators/base64.js";

const err = (text) => validateBase64(text).errors[0];
const at = (text, needle) => text.indexOf(needle);

describe("validateBase64 · válido", () => {
  it("estándar con relleno: describe variante, relleno, bytes y texto", () => {
    expect(validateBase64("SGVsbG8=")).toEqual({
      valid: true,
      errors: [],
      meta: { variant: "neutral", padded: true, bytes: 5, utf8: true, hadBom: false },
    });
  });

  it("detecta el alfabeto estándar (+ /) y el URL-safe (- _)", () => {
    expect(validateBase64("a+b/").meta.variant).toBe("standard");
    expect(validateBase64("a-b_").meta.variant).toBe("urlsafe");
    expect(validateBase64("abcd").meta.variant).toBe("neutral");
  });

  it("el relleno es opcional (2 y 3 caracteres sobrantes)", () => {
    expect(validateBase64("QQ").meta).toMatchObject({ padded: false, bytes: 1 });
    expect(validateBase64("QUI").meta).toMatchObject({ padded: false, bytes: 2 });
    expect(validateBase64("QQ==").meta).toMatchObject({ padded: true, bytes: 1 });
  });

  it("acepta saltos de línea y espacios (MIME)", () => {
    const r = validateBase64("SGVs\r\nbG8g\n d29y bGQ=");
    expect(r.valid).toBe(true);
    expect(r.meta.bytes).toBe(11);
  });

  it("bytes que no son UTF-8 no invalidan el Base64: solo cambian la meta", () => {
    const r = validateBase64("/w==");
    expect(r.valid).toBe(true);
    expect(r.meta).toMatchObject({ bytes: 1, utf8: false });
    expect(isUtf8(new Uint8Array([0xff]))).toBe(false);
    expect(isUtf8(new Uint8Array([0xf0, 0x9f, 0x91, 0x8b]))).toBe(true);
  });

  it("un BOM al principio se ignora y se anota", () => {
    expect(validateBase64("﻿QUJD").meta).toMatchObject({ bytes: 3, hadBom: true });
  });
});

describe("validateBase64 · errores con posición", () => {
  it("vacío / solo espacios → pista 'empty'", () => {
    for (const input of ["", "  \n", null, undefined]) {
      expect(err(input)).toMatchObject({ hint: "empty", offset: null });
    }
  });

  it("carácter fuera del alfabeto: su posición exacta, con línea y columna", () => {
    const text = "SGVs\nbG8!d29y";
    expect(err(text)).toMatchObject({
      hint: "badChar", offset: at(text, "!"), line: 2, column: 4, params: { char: "!" },
    });
  });

  it("los espacios intermedios no cuentan para la posición del error", () => {
    const text = "QU JD $";
    expect(err(text)).toMatchObject({ hint: "badChar", offset: at(text, "$") });
  });

  it("mezclar los dos alfabetos señala el carácter que los mezcla, en cualquier orden", () => {
    expect(err("a+b-")).toMatchObject({ hint: "mixedAlphabet", offset: 3, params: { char: "-" } });
    expect(err("a-b/")).toMatchObject({ hint: "mixedAlphabet", offset: 3, params: { char: "/" } });
  });

  it("datos después del relleno: apunta al primer '='", () => {
    expect(err("QQ==QQ")).toMatchObject({ hint: "paddingMiddle", offset: 2 });
    expect(err("QQ=Q")).toMatchObject({ hint: "paddingMiddle", offset: 2 });
  });

  it("un carácter ajeno tras el relleno se señala a él, no al relleno (el ejemplo de la herramienta)", () => {
    const text = "SGVsbG8s\nIGF1dG9yZXZpIQ=!";
    expect(err(text)).toMatchObject({ hint: "badChar", offset: at(text, "!"), line: 2, column: 16 });
  });

  it("relleno de más o que no cuadra con la longitud", () => {
    expect(err("QQ===")).toMatchObject({ hint: "badPadding", offset: 4 });
    expect(err("QQ=")).toMatchObject({ hint: "badPadding", offset: 2 });
    expect(err("QUJD=")).toMatchObject({ hint: "badPadding", offset: 4 });
    expect(err("==")).toMatchObject({ hint: "badPadding", offset: 0 });
  });

  it("5 caracteres de datos (o 1) no existen: el error cae al final del dato", () => {
    expect(err("QUJDQ")).toMatchObject({ hint: "badLength", offset: 5, params: { length: 5 } });
    expect(err("Q")).toMatchObject({ hint: "badLength", offset: 1 });
    // el final se mide sin espacios finales
    expect(err("QUJDQ  \n")).toMatchObject({ hint: "badLength", offset: 5 });
  });

  it("un prefijo data: se avisa en vez de dar un error de carácter", () => {
    expect(err("data:text/plain;base64,SGVsbG8=")).toMatchObject({ hint: "dataUri", offset: 0, line: 1, column: 1 });
  });

  it("con BOM, la posición cuenta el BOM (índice real del textarea)", () => {
    const text = "﻿QU!D";
    expect(err(text)).toMatchObject({ hint: "badChar", offset: at(text, "!") });
  });

  it("todas las pistas posibles están cubiertas por estos tests", () => {
    const seen = new Set(
      ["", "!", "a+b-", "QQ==QQ", "QQ=", "Q", "data:x;base64,AA"].map((t) => err(t).hint),
    );
    expect([...seen].sort()).toEqual([...BASE64_HINT_KEYS].sort());
  });
});

describe("scanBase64 · modo URL (JWT)", () => {
  it("rechaza + / = y espacios, con su posición desplazada por `base`", () => {
    expect(() => scanBase64("ab+d", { urlOnly: true, base: 10 })).toThrowError(/Base64URL/);
    try { scanBase64("ab d", { urlOnly: true, base: 10 }); } catch (e) { expect(e.offset).toBe(12); }
    try { scanBase64("abc=", { urlOnly: true }); } catch (e) { expect(e.hint).toBe("notUrlSafe"); }
  });

  it("acepta URL-safe sin relleno y el mensaje lleva la etiqueta", () => {
    expect(scanBase64("a-b_", { urlOnly: true }).variant).toBe("urlsafe");
    expect(() => scanBase64("Q", { urlOnly: true, label: "Header" })).toThrowError(/^Header:/);
  });
});

describe("validateBase64 · robustez", () => {
  it("un texto enorme con un error al final lo localiza sin colgarse", () => {
    const big = "QUJD".repeat(500_000) + "!";
    const t0 = Date.now();
    expect(err(big)).toMatchObject({ hint: "badChar", offset: big.length - 1 });
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it("emojis y caracteres fuera del alfabeto no rompen las posiciones", () => {
    const text = "QUJD👋";
    expect(err(text)).toMatchObject({ hint: "badChar", offset: 4 });
  });
});
