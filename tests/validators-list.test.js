import { describe, it, expect } from "vitest";
import { lineError, runListValidator } from "../lib/validators/list.js";

// Validador de juguete: "ok" es válido, cualquier otra cosa falla en su 2º carácter.
const toy = (value) => (value === "ok" ? { kind: "k" } : lineError(`bad ${value}`, 1, "toy", { v: value }));
const run = (text) => runListValidator(text, toy);

describe("runListValidator", () => {
  it("vacío, solo espacios y null → pista 'empty' sin posición", () => {
    for (const input of ["", "  \n\t\n", null, undefined, "﻿"]) {
      expect(run(input).errors[0]).toMatchObject({ hint: "empty", offset: null, line: null });
    }
  });

  it("todo válido: recuento por tipo y total", () => {
    expect(run("ok\nok\n\nok")).toEqual({
      valid: true, errors: [],
      meta: { total: 3, valid: 3, invalid: 0, breakdown: { k: 3 }, hadBom: false },
    });
  });

  it("un error por línea inválida, con valor, línea, columna y offset", () => {
    const text = "ok\nabc\nok\n  xyz  ";
    const r = run(text);
    expect(r.valid).toBe(false);
    expect(r.meta).toMatchObject({ total: 4, valid: 2, invalid: 2 });
    expect(r.errors).toEqual([
      { message: "bad abc", line: 2, column: 2, offset: text.indexOf("abc") + 1, hint: "toy", params: { v: "abc" }, value: "abc" },
      { message: "bad xyz", line: 4, column: 4, offset: text.indexOf("xyz") + 1, hint: "toy", params: { v: "xyz" }, value: "xyz" },
    ]);
  });

  it("la columna cuenta los espacios de sangría y los saltos \\r\\n no desplazan nada", () => {
    const text = "ok\r\n\tabc\r\nok";
    const [e] = run(text).errors;
    expect(e).toMatchObject({ line: 2, column: 3, offset: text.indexOf("abc") + 1, value: "abc" });
  });

  it("sin index el error cae en el primer carácter del valor", () => {
    const r = runListValidator("  q", () => ({ error: { message: "m", hint: "h" } }));
    expect(r.errors[0]).toMatchObject({ line: 1, column: 3, offset: 2 });
    expect(r.errors[0]).not.toHaveProperty("params");
  });

  it("un fallo al final del valor (index = longitud) queda dentro del texto", () => {
    const text = "abc";
    const r = runListValidator(text, (v) => lineError("short", v.length, "h"));
    expect(r.errors[0]).toMatchObject({ column: 4, offset: 3 });
    expect(r.errors[0].offset).toBeLessThanOrEqual(text.length);
  });

  it("un BOM al principio se ignora y los offsets cuentan el BOM", () => {
    const text = "﻿ok\nabc";
    const r = run(text);
    expect(r.meta.hadBom).toBe(true);
    expect(r.errors[0]).toMatchObject({ line: 2, column: 2, offset: text.indexOf("abc") + 1 });
  });

  it("el último salto de línea no crea un valor vacío", () => {
    expect(run("ok\n").meta.total).toBe(1);
    expect(run("ok\n\n\n").meta.total).toBe(1);
  });

  it("100 000 líneas se validan sin colgarse", () => {
    const text = Array.from({ length: 100_000 }, (_, i) => (i === 99_999 ? "bad" : "ok")).join("\n");
    const t0 = Date.now();
    const r = run(text);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(100_000);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
