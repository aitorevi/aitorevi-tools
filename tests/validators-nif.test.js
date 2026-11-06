import { describe, it, expect } from "vitest";
import { NIF_HINT_KEYS, NIF_KINDS, validateNifs } from "../lib/validators/nif.js";
import { SAMPLE } from "../validar-nif/lib.js";

const err = (v) => validateNifs(v).errors[0];
const kinds = (v) => validateNifs(v).meta.breakdown;

describe("validateNifs · válidos", () => {
  it("DNI: la letra es el resto de dividir entre 23", () => {
    for (const v of ["12345678Z", "00000000T", "99999999R"]) expect(kinds(v)).toEqual({ dni: 1 });
  });

  it("NIE: X, Y y Z valen 0, 1 y 2", () => {
    for (const v of ["X1234567L", "Y1234567X", "Z1234567R", "X0000000T"]) expect(kinds(v)).toEqual({ nie: 1 });
  });

  it("NIF especial K, L, M con la cuenta del DNI sobre las 7 cifras", () => {
    for (const v of ["K1234567L", "L1234567L", "M1234567L"]) expect(kinds(v)).toEqual({ special: 1 });
  });

  it("CIF: control cifra para A y B, letra para P y Q, cualquiera para el resto", () => {
    expect(kinds("A12345674")).toEqual({ cif: 1 });
    expect(kinds("B12345674")).toEqual({ cif: 1 });
    expect(kinds("P1234567D")).toEqual({ cif: 1 });
    expect(kinds("C12345674")).toEqual({ cif: 1 });
    expect(kinds("C1234567D")).toEqual({ cif: 1 });
    expect(kinds("A58818501")).toEqual({ cif: 1 });
    expect(kinds("Q2826000H")).toEqual({ cif: 1 });
  });

  it("minúsculas, espacios alrededor y varios a la vez", () => {
    const r = validateNifs("  12345678z \nx1234567l\r\na58818501");
    expect(r.valid).toBe(true);
    expect(r.meta).toMatchObject({ total: 3, breakdown: { dni: 1, nie: 1, cif: 1 } });
  });

  it("todas las letras de entidad del CIF aceptan su control correcto", () => {
    for (const org of "ABCDEFGHJNPQRSUVW") {
      const r = validateNifs(`${org}12345674\n${org}1234567D`);
      // cada entidad acepta exactamente uno de los dos (o los dos), nunca ninguno
      expect(r.meta.valid, org).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("validateNifs · errores", () => {
  it("separadores: su posición exacta, antes que cualquier otro fallo", () => {
    expect(err("12.345.678-Z")).toMatchObject({ hint: "separator", column: 3, params: { char: "." } });
    expect(err("12345678-Z")).toMatchObject({ hint: "separator", column: 9 });
    expect(err("12345678 Z")).toMatchObject({ hint: "separator", column: 9 });
  });

  it("carácter que no es letra ni número", () => {
    expect(err("1234567*Z")).toMatchObject({ hint: "badChar", column: 8, params: { char: "*" } });
  });

  it("longitud: corto apunta al final, largo al décimo carácter", () => {
    expect(err("1234567Z")).toMatchObject({ hint: "tooShort", column: 9, params: { length: 8 } });
    expect(err("12345678ZZ")).toMatchObject({ hint: "tooLong", column: 10, params: { length: 10 } });
  });

  it("letra inicial que no existe, y el carácter exacto", () => {
    expect(err("I2345678Z")).toMatchObject({ hint: "badStart", column: 1, params: { char: "I" } });
    expect(err("O1234567Z")).toMatchObject({ hint: "badStart" });
    expect(err("T1234567Z")).toMatchObject({ hint: "badStart" });
  });

  it("letra donde va un número, en cualquier tipo", () => {
    expect(err("12A45678Z")).toMatchObject({ hint: "badShape", column: 3, params: { char: "A" } });
    expect(err("X12A4567L")).toMatchObject({ hint: "badShape", column: 4 });
    expect(err("A12345B74")).toMatchObject({ hint: "badShape", column: 7 });
    expect(err("K123456AL")).toMatchObject({ hint: "badShape", column: 8 });
  });

  it("control incorrecto: indica cuál debería ser", () => {
    expect(err("12345678A")).toMatchObject({ hint: "badControl", column: 9, params: { expected: "Z" } });
    expect(err("12345678")).toMatchObject({ hint: "tooShort" });
    expect(err("123456789")).toMatchObject({ hint: "badControl", params: { expected: "Z" } });
    expect(err("X1234567A")).toMatchObject({ hint: "badControl", params: { expected: "L" } });
    expect(err("K1234567T")).toMatchObject({ hint: "badControl", params: { expected: "L" } });
  });

  it("CIF: el tipo de control depende de la entidad", () => {
    expect(err("A1234567D")).toMatchObject({ hint: "badControl", params: { expected: "4" } }); // A pide cifra
    expect(err("P12345674")).toMatchObject({ hint: "badControl", params: { expected: "D" } }); // P pide letra
    expect(err("C12345675")).toMatchObject({ hint: "badControl", params: { expected: "4 / D" } });
  });

  it("varios: un error por línea con su valor", () => {
    const r = validateNifs(SAMPLE);
    expect(r.meta).toMatchObject({ total: 5, valid: 3, invalid: 2, breakdown: { dni: 1, nie: 1, cif: 1 } });
    expect(r.errors.map((e) => [e.line, e.hint, e.value])).toEqual([
      [3, "badControl", "12345678A"], [5, "tooShort", "1234567Z"],
    ]);
  });

  it("todas las pistas y tipos posibles están cubiertos por estos tests", () => {
    const seen = new Set(
      ["", "12.345.678-Z", "1234567*Z", "1234567Z", "12345678ZZ", "I2345678Z", "12A45678Z", "12345678A"].map((v) => err(v).hint),
    );
    expect([...seen].sort()).toEqual([...NIF_HINT_KEYS].sort());
    expect(Object.keys(kinds("12345678Z\nX1234567L\nK1234567L\nA58818501")).sort()).toEqual([...NIF_KINDS].sort());
  });
});
