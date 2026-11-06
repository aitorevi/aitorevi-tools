import { describe, it, expect } from "vitest";
import { JWT_HINT_KEYS, JWT_NOTE_KEYS, validateJwt } from "../lib/validators/jwt.js";
import { SAMPLE } from "../validar-jwt/lib.js";

const b64 = (v) =>
  Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const token = (header = { alg: "HS256", typ: "JWT" }, payload = { sub: "1" }, sig = "c2ln") =>
  [b64(header), b64(payload), sig].join(".");

const NOW = Date.UTC(2026, 0, 1); // 2026-01-01T00:00:00Z
const sec = (iso) => Date.parse(iso) / 1000;
const run = (t) => validateJwt(t, NOW);
const err = (t) => run(t).errors[0];

describe("validateJwt · válido", () => {
  it("token normal: alg, typ y fechas legibles", () => {
    const t = token({ alg: "HS256", typ: "JWT" }, { sub: "1", iat: sec("2025-12-31T00:00:00Z"), exp: sec("2026-02-01T00:00:00Z") });
    expect(run(t)).toEqual({
      valid: true,
      errors: [],
      meta: {
        alg: "HS256", typ: "JWT",
        exp: "2026-02-01T00:00:00.000Z", nbf: null, iat: "2025-12-31T00:00:00.000Z",
        notes: [], hadBom: false,
      },
    });
  });

  it("sin typ ni fechas: los campos van a null", () => {
    expect(run(token({ alg: "RS256" })).meta).toMatchObject({ alg: "RS256", typ: null, exp: null, nbf: null, iat: null });
  });

  it("espacios y saltos alrededor se ignoran, y el BOM también", () => {
    expect(run(`\n  ${token()}  \n`).valid).toBe(true);
    expect(run(`﻿${token()}`).meta.hadBom).toBe(true);
  });

  it("la firma no se verifica: una cualquiera en Base64URL vale", () => {
    expect(run(token(undefined, undefined, "firma-no-verificada")).valid).toBe(true);
  });

  it("alg none con firma vacía es válido pero se avisa", () => {
    const r = run(`${b64({ alg: "none" })}.${b64({ a: 1 })}.`);
    expect(r.valid).toBe(true);
    expect(r.meta.notes).toEqual([{ key: "algNone" }]);
    expect(run(`${b64({ alg: "NONE" })}.${b64({})}.`).valid).toBe(true);
  });

  it("el ejemplo de la herramienta falla solo por la firma que le falta; con ella es válido", () => {
    expect(err(SAMPLE)).toMatchObject({ hint: "partsCount", offset: SAMPLE.length, params: { count: 2 } });
    expect(run(`${SAMPLE}.firma-ok`).valid).toBe(true);
  });
});

describe("validateJwt · avisos de fechas", () => {
  const meta = (payload) => run(token(undefined, payload)).meta.notes;

  it("caducado, con la fecha", () => {
    expect(meta({ exp: sec("2025-01-01T00:00:00Z") })).toEqual([
      { key: "expired", params: { date: "2025-01-01T00:00:00.000Z" } },
    ]);
  });

  it("aún no válido (nbf en el futuro)", () => {
    expect(meta({ nbf: sec("2027-01-01T00:00:00Z") })).toEqual([
      { key: "notYetValid", params: { date: "2027-01-01T00:00:00.000Z" } },
    ]);
  });

  it("exp anterior a iat", () => {
    const notes = meta({ iat: sec("2025-06-01T00:00:00Z"), exp: sec("2025-05-01T00:00:00Z") });
    expect(notes.map((n) => n.key)).toEqual(["expired", "expBeforeIat"]);
  });

  it("exp exactamente ahora no está caducado todavía; sin exp no hay aviso", () => {
    expect(meta({ exp: NOW / 1000 })).toEqual([]);
    expect(meta({})).toEqual([]);
  });

  it("fechas con decimales y negativas son números válidos", () => {
    expect(meta({ iat: 1.5, nbf: -10 })).toEqual([]);
  });

  it("todos los avisos posibles están cubiertos", () => {
    const keys = new Set([
      ...meta({ exp: 1, nbf: sec("2027-01-01T00:00:00Z"), iat: 5 }).map((n) => n.key),
      ...run(`${b64({ alg: "none" })}.${b64({})}.`).meta.notes.map((n) => n.key),
    ]);
    expect([...keys].sort()).toEqual([...JWT_NOTE_KEYS].sort());
  });
});

describe("validateJwt · errores con posición", () => {
  it("vacío → 'empty'", () => {
    for (const x of ["", " \n", null, undefined]) expect(err(x)).toMatchObject({ hint: "empty", offset: null });
  });

  it("prefijo Bearer: apunta al inicio del token, ignorando espacios previos", () => {
    expect(err(`  Bearer ${token()}`)).toMatchObject({ hint: "bearerPrefix", offset: 2 });
    expect(err(`bearer\t${token()}`).hint).toBe("bearerPrefix");
  });

  it("menos de tres partes: el error cae al final del texto", () => {
    const t = `${b64({ alg: "HS256" })}.${b64({})}`;
    expect(err(t)).toMatchObject({ hint: "partsCount", offset: t.length, params: { count: 2 } });
    expect(err("abc")).toMatchObject({ hint: "partsCount", params: { count: 1 } });
  });

  it("más de tres partes: el primer punto sobrante", () => {
    const t = `${token()}.x`;
    expect(err(t)).toMatchObject({ hint: "partsCount", offset: t.lastIndexOf("."), params: { count: 4 } });
    expect(err(`${token()}.x.y.z`).params.count).toBe(6);
  });

  it("cinco partes: token cifrado (JWE)", () => {
    expect(err("a.b.c.d.e")).toMatchObject({ hint: "encrypted", offset: 0 });
  });

  it("partes vacías apuntan a su inicio", () => {
    const h = b64({ alg: "HS256" });
    expect(err(`.${b64({})}.sig`)).toMatchObject({ hint: "emptyPart", offset: 0 });
    expect(err(`${h}..sig`)).toMatchObject({ hint: "emptyPart", offset: h.length + 1 });
  });

  it("firma vacía con un alg normal", () => {
    const t = `${b64({ alg: "HS256" })}.${b64({})}.`;
    expect(err(t)).toMatchObject({ hint: "missingSignature", offset: t.length });
  });

  it("alg none con firma", () => {
    const t = `${b64({ alg: "none" })}.${b64({})}.abc`;
    expect(err(t)).toMatchObject({ hint: "noneWithSignature", offset: t.lastIndexOf(".") + 1 });
  });

  it("carácter que no es Base64URL: posición exacta dentro de la parte", () => {
    const h = b64({ alg: "HS256" });
    const t = `${h}.ab*d.sig`;
    expect(err(t)).toMatchObject({ hint: "badChar", offset: t.indexOf("*"), params: { char: "*" } });
    expect(err(`${h}.ab+d.sig`)).toMatchObject({ hint: "notUrlSafe" });
    expect(err(`${h}.abcd=.sig`)).toMatchObject({ hint: "notUrlSafe" });
    expect(err(`${h}.ab d.sig`)).toMatchObject({ hint: "badChar" });
  });

  it("parte con longitud imposible", () => {
    const h = b64({ alg: "HS256" });
    expect(err(`${h}.abcde.sig`)).toMatchObject({ hint: "badLength", offset: h.length + 1 + 5 });
  });

  it("firma con caracteres inválidos o longitud imposible", () => {
    const base = `${b64({ alg: "HS256" })}.${b64({})}`;
    expect(err(`${base}.s!g`)).toMatchObject({ hint: "badChar", offset: base.length + 2 });
    expect(err(`${base}.abcde`).hint).toBe("badLength");
  });

  it("header que no es UTF-8, no es JSON o no es un objeto", () => {
    const p = b64({});
    expect(err(`${Buffer.from([0xff, 0xfe]).toString("base64url")}.${p}.sig`)).toMatchObject({ hint: "notUtf8", offset: 0 });
    const bad = err(`${b64("{nope")}.${p}.sig`);
    expect(bad).toMatchObject({ hint: "notJson", offset: 0 });
    expect(bad.message).toMatch(/^Header is not valid JSON/);
    expect(err(`${b64("[1]")}.${p}.sig`)).toMatchObject({ hint: "notObject" });
    expect(err(`${b64("null")}.${p}.sig`)).toMatchObject({ hint: "notObject" });
    expect(err(`${b64('"x"')}.${p}.sig`)).toMatchObject({ hint: "notObject" });
  });

  it("payload inválido: el mensaje lo nombra y apunta a su inicio", () => {
    const h = b64({ alg: "HS256" });
    const e = err(`${h}.${b64("{")}.sig`);
    expect(e).toMatchObject({ hint: "notJson", offset: h.length + 1 });
    expect(e.message).toMatch(/^Payload is not valid JSON/);
  });

  it("alg ausente, vacío o que no es texto", () => {
    for (const header of [{}, { alg: "" }, { alg: 5 }, { alg: null }]) {
      expect(err(token(header))).toMatchObject({ hint: "noAlg", offset: 0 });
    }
  });

  it("exp, nbf e iat deben ser números de segundos", () => {
    const h = b64({ alg: "HS256" });
    for (const claim of ["exp", "nbf", "iat"]) {
      for (const bad of ["1700000000", null, true, [], 1e20]) {
        expect(err(token({ alg: "HS256" }, { [claim]: bad }))).toMatchObject({
          hint: "claimType", offset: h.length + 1, params: { claim },
        });
      }
    }
  });

  it("con BOM y espacios previos, las posiciones siguen siendo las del texto", () => {
    const text = `﻿ \n${token().replace(".", "!.")}`;
    expect(err(text)).toMatchObject({ hint: "badChar", offset: text.indexOf("!"), line: 2 });
  });

  it("todas las pistas posibles están cubiertas por estos tests", () => {
    const h = b64({ alg: "HS256" });
    const p = b64({});
    const seen = new Set(
      [
        "", "Bearer x", "a.b", "a.b.c.d.e", `.${p}.s`, "x.y.z!", `${h}.ab+d.s`, `${h}.abcde.s`,
        `${Buffer.from([0xff]).toString("base64url")}.${p}.s`, `${b64("{")}.${p}.s`, `${b64("1")}.${p}.s`,
        token({}), `${h}.${p}.`, `${b64({ alg: "none" })}.${p}.x`, token(undefined, { exp: "x" }),
        `${h}.a b.s`,
      ].map((t) => err(t).hint),
    );
    expect([...seen].sort()).toEqual([...JWT_HINT_KEYS].sort());
  });
});
