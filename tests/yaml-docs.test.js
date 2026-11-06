import { describe, it, expect } from "vitest";
import { loadUMD } from "./_umd.js";
import { loadDocuments } from "../lib/yaml-docs.js";

const jsyaml = loadUMD("vendor/js-yaml.min.js", "jsyaml");

describe("loadDocuments", () => {
  it("un documento → array de uno, igual que load", () => {
    expect(loadDocuments(jsyaml, "a: 1")).toEqual([{ a: 1 }]);
    expect(loadDocuments(jsyaml, "- 1\n- 2")).toEqual([[1, 2]]);
    expect(loadDocuments(jsyaml, "hola")).toEqual(["hola"]);
  });

  it("varios documentos → todos, en orden", () => {
    expect(loadDocuments(jsyaml, "a: 1\n---\nb: 2\n---\n- x")).toEqual([{ a: 1 }, { b: 2 }, ["x"]]);
  });

  it("un error de sintaxis se propaga (no se confunde con varios documentos)", () => {
    expect(() => loadDocuments(jsyaml, "a: [1")).toThrow(/flow collection/);
    expect(() => loadDocuments(jsyaml, "a: 1\n---\nb: [1")).toThrow(/flow collection/);
  });
});

describe("loadDocuments · entrada sin datos (js-yaml 5 lanza en load(\"\"))", () => {
  it("vacío o solo comentarios dan un documento null, como con js-yaml 4", () => {
    expect(loadDocuments(jsyaml, "")).toEqual([null]);
    expect(loadDocuments(jsyaml, "# solo comentario")).toEqual([null]);
  });
});
