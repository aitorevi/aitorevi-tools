import { describe, it, expect } from "vitest";
import { format, PARSERS, SAMPLE } from "../formatear-js/lib.js";
import { loadUMD } from "./_umd.js";

const prettierTool = loadUMD("vendor/prettier.min.js", "prettierTool");

describe("format", () => {
  it("embellece JavaScript con Prettier", async () => {
    const out = await format("const x={a:1,b:[2,3]};function f(  ){return x.a}", prettierTool, "babel");
    expect(out).toContain("const x = { a: 1, b: [2, 3] };");
    expect(out).toMatch(/function f\(\) \{\n {2}return x\.a;/);
  });

  it("embellece TypeScript (incluye tipos)", async () => {
    const out = await format("interface P{a:number} const x:P={a:1}", prettierTool, "typescript");
    expect(out).toContain("interface P {");
    expect(out).toMatch(/const x: P = \{ a: 1 \};/);
  });

  it("es idempotente: format(format(x)) === format(x)", async () => {
    const once = await format(SAMPLE, prettierTool, "babel");
    expect(await format(once, prettierTool, "babel")).toBe(once);
  });

  it("rechaza código vacío", async () => {
    await expect(format("   ", prettierTool, "babel")).rejects.toThrow();
  });

  it("rechaza JS con error de sintaxis", async () => {
    await expect(format("const x = {", prettierTool, "babel")).rejects.toThrow();
  });
});

describe("PARSERS", () => {
  it("ofrece JavaScript y TypeScript", () => {
    expect(PARSERS.map((p) => p.value)).toEqual(["babel", "typescript"]);
  });
});
