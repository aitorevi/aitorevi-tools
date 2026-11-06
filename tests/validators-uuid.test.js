import { describe, it, expect } from "vitest";
import { UUID_HINT_KEYS, UUID_KINDS, validateUuids } from "../lib/validators/uuid.js";
import { SAMPLE } from "../validar-uuid/lib.js";

const err = (v) => validateUuids(v).errors[0];
const V4 = "550e8400-e29b-41d4-a716-446655440000";

describe("validateUuids · válidos", () => {
  it("un UUID v4: recuento por versión", () => {
    expect(validateUuids(V4)).toEqual({
      valid: true, errors: [],
      meta: { total: 1, valid: 1, invalid: 0, breakdown: { v4: 1 }, hadBom: false },
    });
  });

  it("mayúsculas, minúsculas y mezcla", () => {
    expect(validateUuids(V4.toUpperCase()).valid).toBe(true);
    expect(validateUuids("550E8400-e29b-41D4-A716-446655440000").valid).toBe(true);
  });

  it("cada versión del 1 al 8 y las variantes 8, 9, a y b", () => {
    for (let v = 1; v <= 8; v++) {
      expect(validateUuids(`550e8400-e29b-${v}1d4-a716-446655440000`).meta.breakdown).toEqual({ [`v${v}`]: 1 });
    }
    for (const variant of "89abAB") expect(validateUuids(`550e8400-e29b-41d4-${variant}716-446655440000`).valid).toBe(true);
  });

  it("el UUID nulo y el máximo son válidos aunque no tengan versión", () => {
    const r = validateUuids("00000000-0000-0000-0000-000000000000\nFFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF");
    expect(r.valid).toBe(true);
    expect(r.meta.breakdown).toEqual({ nil: 1, max: 1 });
  });

  it("varios a la vez, con líneas vacías y espacios alrededor", () => {
    const r = validateUuids(`  ${V4}  \n\n${V4}\r\n`);
    expect(r.meta).toMatchObject({ total: 2, valid: 2, breakdown: { v4: 2 } });
  });
});

describe("validateUuids · errores", () => {
  it("sin guiones apunta donde iría el primero", () => {
    expect(err("550e8400e29b41d4a716446655440000")).toMatchObject({ hint: "noHyphens", column: 9 });
  });

  it("envuelto en llaves, paréntesis o urn:uuid:", () => {
    for (const v of [`{${V4}}`, `(${V4})`, `urn:uuid:${V4}`, `URN:UUID:${V4}`]) expect(err(v)).toMatchObject({ hint: "wrapped", column: 1 });
  });

  it("guion mal colocado, sea de más o de menos", () => {
    expect(err("550e8400-e29b-41d4-a716-4466-5544000")).toMatchObject({ hint: "badHyphen", column: 29 });
    expect(err("550e840-0e29b-41d4-a716-446655440000")).toMatchObject({ hint: "badHyphen", column: 8 });
    expect(err("550e8400_e29b-41d4-a716-446655440000")).toMatchObject({ hint: "badHyphen", column: 9 });
  });

  it("carácter que no es hexadecimal: su posición y el carácter", () => {
    expect(err("550e840g-e29b-41d4-a716-446655440000")).toMatchObject({ hint: "badChar", column: 8, params: { char: "g" } });
  });

  it("demasiado corto o largo, con la longitud", () => {
    expect(err(V4.slice(0, 35))).toMatchObject({ hint: "tooShort", column: 36, params: { length: 35 } });
    expect(err(`${V4}0`)).toMatchObject({ hint: "tooLong", column: 37, params: { length: 37 } });
    expect(err("550e8400-e29b-41d4")).toMatchObject({ hint: "tooShort", params: { length: 18 } });
  });

  it("versión 0 o 9 y variante fuera de 8-b", () => {
    expect(err("550e8400-e29b-01d4-a716-446655440000")).toMatchObject({ hint: "badVersion", column: 15, params: { char: "0" } });
    expect(err("550e8400-e29b-91d4-a716-446655440000")).toMatchObject({ hint: "badVersion", params: { char: "9" } });
    expect(err("550e8400-e29b-41d4-c716-446655440000")).toMatchObject({ hint: "badVariant", column: 20, params: { char: "c" } });
  });

  it("varios inválidos: un error por línea, con su línea y valor", () => {
    const r = validateUuids(SAMPLE);
    expect(r.meta).toMatchObject({ total: 4, valid: 2, invalid: 2, breakdown: { v4: 1, v1: 1 } });
    expect(r.errors.map((e) => [e.line, e.hint])).toEqual([[2, "tooShort"], [3, "badVariant"]]);
  });

  it("todas las pistas posibles están cubiertas por estos tests", () => {
    const seen = new Set(
      ["", "550e8400e29b41d4a716446655440000", `{${V4}}`, "550e840-0e29b-41d4-a716-446655440000", "550e840g-e29b-41d4-a716-446655440000",
        V4.slice(0, 35), `${V4}0`, "550e8400-e29b-91d4-a716-446655440000", "550e8400-e29b-41d4-c716-446655440000"]
        .map((v) => err(v).hint),
    );
    expect([...seen].sort()).toEqual([...UUID_HINT_KEYS].sort());
    for (let v = 1; v <= 8; v++) expect(UUID_KINDS).toContain(`v${v}`);
  });
});
