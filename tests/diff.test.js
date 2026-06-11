import { describe, it, expect } from "vitest";
import { diffLines, diffStats, SAMPLE_A, SAMPLE_B } from "../diff/lib.js";

describe("diffLines", () => {
  it("marca líneas iguales, quitadas y añadidas", () => {
    expect(diffLines("a\nb\nc", "a\nB\nc")).toEqual([
      { type: "eq", line: "a" },
      { type: "del", line: "b" },
      { type: "add", line: "B" },
      { type: "eq", line: "c" },
    ]);
  });

  it("texto idéntico → todo eq", () => {
    expect(diffLines("x\ny", "x\ny").every((p) => p.type === "eq")).toBe(true);
  });

  it("detecta una línea añadida al final", () => {
    expect(diffLines("a", "a\nb")).toEqual([
      { type: "eq", line: "a" },
      { type: "add", line: "b" },
    ]);
  });

  it("conserva líneas comunes intercaladas (LCS)", () => {
    const d = diffLines("uno\ndos\ntres", "uno\ntres");
    expect(d).toEqual([
      { type: "eq", line: "uno" },
      { type: "del", line: "dos" },
      { type: "eq", line: "tres" },
    ]);
  });

  it("lanza si los textos son enormes", () => {
    const big = Array.from({ length: 2100 }, (_, i) => i).join("\n");
    expect(() => diffLines(big, big.replace(/0/g, "x"))).toThrow();
  });
});

describe("diffStats", () => {
  it("cuenta añadidas y quitadas del SAMPLE", () => {
    const { added, removed } = diffStats(diffLines(SAMPLE_A, SAMPLE_B));
    expect(added).toBe(3); // version: 2, debug: true, ssl: on
    expect(removed).toBe(2); // version: 1, debug: false
  });
});
