import { describe, it, expect } from "vitest";
import { format, SAMPLE } from "../formatear-yaml/lib.js";
import { loadUMD } from "./_umd.js";

const jsyaml = loadUMD("vendor/js-yaml.min.js", "jsyaml");

describe("format", () => {
  it("normaliza el estilo flow a bloque con sangría de 2 espacios", () => {
    expect(format("a: {x: 1, z: 2}", jsyaml)).toBe("a:\n  x: 1\n  z: 2");
  });

  it("normaliza listas en flujo a guiones", () => {
    expect(format("xs: [1, 2, 3]", jsyaml)).toBe("xs:\n  - 1\n  - 2\n  - 3");
  });

  it("es idempotente: format(format(x)) === format(x)", () => {
    const once = format(SAMPLE, jsyaml);
    expect(format(once, jsyaml)).toBe(once);
  });

  it("valida: lanza un error controlado con YAML inválido o vacío", () => {
    expect(() => format("a: [1, 2", jsyaml)).toThrow();   // flujo sin cerrar
    expect(() => format("a:\n b:\n\tc: 1", jsyaml)).toThrow(); // tabulador ilegal
    expect(() => format("", jsyaml)).toThrow();            // vacío
  });

  it("el SAMPLE es un YAML válido", () => {
    expect(() => format(SAMPLE, jsyaml)).not.toThrow();
  });
});
