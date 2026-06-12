import { describe, it, expect, beforeAll } from "vitest";
import { convert, SAMPLE_CSV } from "../convertir-datos/lib.js";
import { loadUMD } from "./_umd.js";

let libs;
beforeAll(() => {
  libs = {
    yaml: loadUMD("vendor/js-yaml.min.js", "jsyaml"),
    xml:  loadUMD("vendor/fast-xml-parser.min.js", "fxp"),
    toml: loadUMD("vendor/smol-toml.min.js", "SmolTOML"),
  };
});

describe("CSV → JSON", () => {
  it("convierte el sample CSV a un array de objetos", () => {
    const result = JSON.parse(convert(SAMPLE_CSV, "csv", "json", libs));
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Alice", age: "30", city: "Madrid" });
  });
});

describe("JSON → CSV", () => {
  it("serializa un array de objetos a CSV con cabecera", () => {
    const json = JSON.stringify([{ a: "1", b: "x" }, { a: "2", b: "y" }]);
    const csv = convert(json, "json", "csv", libs);
    expect(csv).toContain("a,b");
    expect(csv).toContain("1,x");
  });
  it("escapa valores con coma", () => {
    const json = JSON.stringify([{ name: "García, Ana", city: "Madrid" }]);
    const csv = convert(json, "json", "csv", libs);
    expect(csv).toContain('"García, Ana"');
  });
});

describe("CSV → YAML → JSON ida y vuelta", () => {
  it("CSV→YAML→JSON produce el mismo array", () => {
    const yaml = convert(SAMPLE_CSV, "csv", "yaml", libs);
    const json = JSON.parse(convert(yaml, "yaml", "json", libs));
    expect(json).toHaveLength(2);
    expect(json[1].city).toBe("Barcelona");
  });
});

describe("JSON → XML → JSON ida y vuelta", () => {
  it("objeto simple", () => {
    const obj = { person: { name: "Alice", age: 30 } };
    const xml = convert(JSON.stringify(obj), "json", "xml", libs);
    expect(xml).toContain("<name>Alice</name>");
    const back = JSON.parse(convert(xml, "xml", "json", libs));
    expect(back.person.name).toBe("Alice");
  });
});

describe("JSON → TOML → JSON ida y vuelta", () => {
  it("objeto plano", () => {
    const obj = { title: "Test", count: 3 };
    const toml = convert(JSON.stringify(obj), "json", "toml", libs);
    expect(toml).toContain('title = "Test"');
    const back = JSON.parse(convert(toml, "toml", "json", libs));
    expect(back.title).toBe("Test");
    expect(back.count).toBe(3);
  });

  it("array de objetos se envuelve en items", () => {
    const arr = [{ name: "Alice" }, { name: "Bob" }];
    const toml = convert(JSON.stringify(arr), "json", "toml", libs);
    expect(toml).toContain("[[items]]");
    expect(toml).toContain('name = "Alice"');
  });

  it("CSV → TOML no lanza error", () => {
    expect(() => convert(SAMPLE_CSV, "csv", "toml", libs)).not.toThrow();
  });
});

describe("mismo formato (no-op)", () => {
  it("devuelve el texto sin modificar", () => {
    const txt = '{"x":1}';
    expect(convert(txt, "json", "json", libs)).toBe(txt);
  });
});
