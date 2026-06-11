import { describe, it, expect } from "vitest";
import { hashHex, ALGORITHMS, SAMPLE } from "../hash/lib.js";

describe("hashHex", () => {
  it("calcula el SHA-256 conocido de 'abc'", async () => {
    expect(await hashHex("abc", "SHA-256")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("la longitud del hash depende del algoritmo", async () => {
    expect((await hashHex(SAMPLE, "SHA-1")).length).toBe(40);
    expect((await hashHex(SAMPLE, "SHA-256")).length).toBe(64);
    expect((await hashHex(SAMPLE, "SHA-512")).length).toBe(128);
  });

  it("cae a SHA-256 ante un algoritmo no soportado (p. ej. MD5)", async () => {
    expect((await hashHex("x", "MD5")).length).toBe(64);
  });

  it("ALGORITHMS lista los soportados y no incluye MD5", () => {
    expect(ALGORITHMS).toContain("SHA-256");
    expect(ALGORITHMS).not.toContain("MD5");
  });
});
