import { describe, it, expect } from "vitest";
import { signJwt, SIGN_ALGORITHMS, SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET } from "../jwt/signer.js";

describe("signJwt", () => {
  it("genera un JWT con tres partes separadas por puntos", async () => {
    const token = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("el header es base64url de {alg,typ}", async () => {
    const token = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET, "HS256");
    const headerJson = atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"));
    expect(JSON.parse(headerJson)).toEqual({ alg: "HS256", typ: "JWT" });
  });

  it("HS256 produce firma de 43 chars base64url", async () => {
    const token = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET, "HS256");
    expect(token.split(".")[2]).toHaveLength(43);
  });

  it("HS512 produce firma de 86 chars base64url", async () => {
    const token = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET, "HS512");
    expect(token.split(".")[2]).toHaveLength(86);
  });

  it("mismo input produce mismo token (determinista)", async () => {
    const t1 = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET);
    const t2 = await signJwt(SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET);
    expect(t1).toBe(t2);
  });

  it("lanza si el secreto está vacío", async () => {
    await expect(signJwt(SIGN_SAMPLE_PAYLOAD, "")).rejects.toThrow();
  });

  it("SIGN_ALGORITHMS incluye HS256, HS384 y HS512", () => {
    expect(SIGN_ALGORITHMS).toEqual(["HS256", "HS384", "HS512"]);
  });
});
