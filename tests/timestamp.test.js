import { describe, it, expect } from "vitest";
import { epochToHuman, humanToEpoch, SAMPLE_EPOCH, SAMPLE_HUMAN } from "../timestamp/lib.js";

describe("epochToHuman", () => {
  it("convierte segundos a ISO 8601", () => {
    const result = epochToHuman("1700000000");
    expect(result).toContain("ISO 8601:");
    expect(result).toContain("2023-11-14");
  });

  it("auto-detecta milisegundos cuando n > 1e10", () => {
    const ms = String(1700000000 * 1000);
    const resultS = epochToHuman("1700000000");
    const resultMs = epochToHuman(ms);
    expect(resultS).toContain(resultMs.match(/ISO 8601:\s+(.+)/)[1]);
  });

  it("muestra ms y s en la salida", () => {
    const result = epochToHuman("1700000000");
    expect(result).toContain("ms:");
    expect(result).toContain("s:");
  });

  it("lanza con entrada no numérica", () => {
    expect(() => epochToHuman("no-es-numero")).toThrow();
  });

  it("epoch 0 es válido (1970-01-01)", () => {
    const result = epochToHuman("0");
    expect(result).toContain("1970-01-01");
  });
});

describe("humanToEpoch", () => {
  it("convierte ISO 8601 a ms y s", () => {
    const result = humanToEpoch(SAMPLE_HUMAN);
    expect(result).toContain("ms (Unix):");
    expect(result).toContain("s (Unix):");
    expect(result).toContain("ISO 8601:");
  });

  it("round-trip: epoch→human→epoch da el mismo timestamp en ms", () => {
    const human = epochToHuman(SAMPLE_EPOCH);
    const iso = human.match(/ISO 8601:\s+(.+)/)[1].trim();
    const back = humanToEpoch(iso);
    const ms = parseInt(back.match(/ms \(Unix\):\s+(\d+)/)[1]);
    expect(ms).toBe(Number(SAMPLE_EPOCH) * 1000);
  });

  it("lanza con fecha no reconocida", () => {
    expect(() => humanToEpoch("esto-no-es-fecha")).toThrow();
  });
});
