import { describe, it, expect } from "vitest";
import { format, TARGETS, SAMPLE } from "../json-a-csharp/lib.js";
import { loadUMD } from "./_umd.js";

const quicktypeCore = loadUMD("vendor/quicktype-core.min.js", "quicktypeCore");

describe("format", () => {
  it("genera clases C# desde el JSON", async () => {
    const out = await format('{"id":1,"name":"x"}', quicktypeCore, "csharp");
    expect(out).toContain("public partial class Root");
    expect(out).toContain("public long Id");
    expect(out).toContain("public string Name");
  });

  it("genera interfaces TypeScript", async () => {
    const out = await format('{"id":1,"name":"x"}', quicktypeCore, "typescript");
    expect(out).toContain("export interface Root");
    expect(out).toMatch(/id\s*:\s*number/);
    expect(out).toMatch(/name\s*:\s*string/);
  });

  it("infiere tipos anidados del SAMPLE", async () => {
    const out = await format(SAMPLE, quicktypeCore, "csharp");
    expect(out).toContain("class Root");
    expect(out).toContain("class Profile");
  });

  it("cae a C# ante un lenguaje desconocido", async () => {
    const out = await format(SAMPLE, quicktypeCore, "no-existe");
    expect(out).toContain("class Root");
  });

  it("rechaza JSON inválido o vacío", async () => {
    await expect(format("{ no es json", quicktypeCore)).rejects.toThrow();
    await expect(format("   ", quicktypeCore)).rejects.toThrow();
  });
});

describe("TARGETS", () => {
  it("ofrece C# y TypeScript", () => {
    expect(TARGETS.map((t) => t.value)).toEqual(["csharp", "typescript"]);
  });
});
