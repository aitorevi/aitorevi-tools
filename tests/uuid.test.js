import { describe, it, expect } from "vitest";
import { generateUUIDs, COUNTS } from "../uuid/lib.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateUUIDs", () => {
  it("genera un UUID con formato RFC 4122 v4", () => {
    const result = generateUUIDs(1);
    expect(result).toMatch(UUID_RE);
  });

  it("genera el número correcto de UUIDs separados por salto de línea", () => {
    for (const count of COUNTS) {
      const lines = generateUUIDs(count).split('\n');
      expect(lines).toHaveLength(count);
    }
  });

  it("todos los UUIDs generados son válidos", () => {
    const lines = generateUUIDs(10).split('\n');
    for (const uuid of lines) {
      expect(uuid).toMatch(UUID_RE);
    }
  });

  it("genera UUIDs únicos entre sí", () => {
    const lines = generateUUIDs(10).split('\n');
    const unique = new Set(lines);
    expect(unique.size).toBe(10);
  });

  it("COUNTS contiene [1, 5, 10]", () => {
    expect(COUNTS).toEqual([1, 5, 10]);
  });
});
