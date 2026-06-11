import { describe, it, expect } from "vitest";
import { format, DIALECTS, SAMPLE } from "../formatear-sql/lib.js";
import { loadUMD } from "./_umd.js";

const sqlFormatter = loadUMD("vendor/sql-formatter.min.js", "sqlFormatter");

describe("format", () => {
  it("pone las palabras clave en mayúscula y aplica sangría", () => {
    const out = format("select a, b from t where x = 1", sqlFormatter, "sql");
    expect(out).toContain("SELECT");
    expect(out).toContain("FROM");
    expect(out).toContain("WHERE");
    expect(out).toMatch(/\n {2}a,/); // columnas indentadas con 2 espacios
  });

  it("es idempotente: format(format(x)) === format(x)", () => {
    const once = format(SAMPLE, sqlFormatter, "postgresql");
    expect(format(once, sqlFormatter, "postgresql")).toBe(once);
  });

  it("acepta todos los dialectos ofrecidos sin lanzar", () => {
    for (const d of DIALECTS) {
      expect(() => format(SAMPLE, sqlFormatter, d.value)).not.toThrow();
    }
  });

  it("usa el dialecto por defecto si no se pasa ninguno", () => {
    expect(() => format("select 1", sqlFormatter)).not.toThrow();
  });

  it("lanza un error controlado con entrada vacía", () => {
    expect(() => format("   ", sqlFormatter, "sql")).toThrow();
  });
});

describe("DIALECTS", () => {
  it("expone una lista con value y label", () => {
    expect(DIALECTS.length).toBeGreaterThan(2);
    expect(DIALECTS[0]).toHaveProperty("value");
    expect(DIALECTS[0]).toHaveProperty("label");
  });
});
