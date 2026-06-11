import { describe, it, expect } from "vitest";
import { decodeJwt, base64UrlDecode, unixToIso, isExpired, SAMPLE } from "../jwt/lib.js";

describe("decodeJwt", () => {
  it("decodifica header y payload del SAMPLE", () => {
    const { header, payload, signature } = decodeJwt(SAMPLE);
    expect(header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload.sub).toBe("1234567890");
    expect(payload.name).toBe("Aitor Reviriego");
    expect(payload.role).toBe("admin");
    expect(signature).toBe("firma-no-verificada");
  });

  it("lanza si no hay tres partes", () => {
    expect(() => decodeJwt("a.b")).toThrow();
    expect(() => decodeJwt("solo-una-parte")).toThrow();
    expect(() => decodeJwt("")).toThrow();
  });

  it("lanza si el payload no es Base64URL/JSON válido", () => {
    expect(() => decodeJwt("eyJhbGciOiJIUzI1NiJ9.@@@noBase64@@@.sig")).toThrow();
  });
});

describe("base64UrlDecode", () => {
  it("decodifica Base64URL a UTF-8 (con caracteres no ASCII)", () => {
    // {"name":"Aitor Reviriégo"} en Base64URL
    const b64 = Buffer.from(JSON.stringify({ name: "Aitor Reviriégo" }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(JSON.parse(base64UrlDecode(b64)).name).toBe("Aitor Reviriégo");
  });
});

describe("unixToIso / isExpired", () => {
  it("convierte timestamps UNIX a ISO", () => {
    expect(unixToIso(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(unixToIso("x")).toBeNull();
  });

  it("detecta expiración según exp", () => {
    expect(isExpired({ exp: 1 })).toBe(true); // 1970
    expect(isExpired({ exp: 9999999999 })).toBe(false); // año 2286
    expect(isExpired({})).toBeNull();
  });
});
