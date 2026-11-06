import { describe, it, expect } from "vitest";
import { IBAN_HINT_KEYS, IBAN_LENGTHS, validateIbans } from "../lib/validators/iban.js";
import { SAMPLE } from "../validar-iban/lib.js";

const err = (v) => validateIbans(v).errors[0];

// IBAN de ejemplo publicados por los bancos centrales / el registro SWIFT.
const REAL = [
  "GB82 WEST 1234 5698 7654 32", "DE89 3704 0044 0532 0130 00", "ES91 2100 0418 4502 0005 1332",
  "FR14 2004 1010 0505 0001 3M02 606", "IT60 X054 2811 1010 0000 0123 456", "NL91 ABNA 0417 1643 00",
  "PT50 0002 0123 1234 5678 9015 4", "BE68 5390 0754 7034", "CH93 0076 2011 6238 5295 7",
  "AT61 1904 3002 3457 3201", "PL61 1090 1014 0000 0712 1981 2874", "NO93 8601 1117 947",
  "SE45 5000 0000 0583 9825 7466", "DK50 0040 0440 1162 43", "FI21 1234 5600 0007 85",
  "IE29 AIBK 9311 5212 3456 78", "LU28 0019 4006 4475 0000", "GR16 0110 1250 0000 0001 2300 695",
];

describe("validateIbans · válidos", () => {
  it("IBAN reales de 18 países, agrupados", () => {
    for (const iban of REAL) expect(validateIbans(iban).valid, iban).toBe(true);
  });

  it("sin espacios, en minúsculas y con espacios irregulares", () => {
    expect(validateIbans("ES9121000418450200051332").valid).toBe(true);
    expect(validateIbans("es91 2100 0418 4502 0005 1332").valid).toBe(true);
    expect(validateIbans("  ES91  2100 04184502 0005 1332  ").valid).toBe(true);
  });

  it("recuento por país con una lista", () => {
    const r = validateIbans(REAL.concat(REAL[2]).join("\n"));
    expect(r.valid).toBe(true);
    expect(r.meta).toMatchObject({ total: 19, breakdown: { ES: 2, DE: 1, GB: 1 } });
  });

  it("la tabla de longitudes cubre los países de los ejemplos", () => {
    for (const iban of REAL) expect(IBAN_LENGTHS[iban.slice(0, 2)], iban).toBe(iban.replace(/ /g, "").length);
  });
});

describe("validateIbans · errores", () => {
  const ES = "ES91 2100 0418 4502 0005 1332";

  it("cifras de control mal: apunta a las cifras de control", () => {
    expect(err("ES91 2100 0418 4502 0005 1333")).toMatchObject({ hint: "badChecksum", line: 1, column: 3 });
    expect(err("ES92 2100 0418 4502 0005 1332").hint).toBe("badChecksum");
  });

  it("cualquier dígito cambiado se detecta", () => {
    const compact = ES.replace(/ /g, "");
    for (let i = 4; i < compact.length; i++) {
      const wrong = compact.slice(0, i) + ((Number(compact[i]) + 1) % 10) + compact.slice(i + 1);
      expect(err(wrong).hint, `posición ${i}`).toBe("badChecksum");
    }
  });

  it("dos dígitos adyacentes intercambiados se detectan", () => {
    expect(err("ES91 2100 0418 4502 0005 1323").hint).toBe("badChecksum");
  });

  it("carácter que no es letra, número ni espacio: su posición exacta", () => {
    expect(err("ES91-2100 0418 4502 0005 1332")).toMatchObject({ hint: "badChar", column: 5, params: { char: "-" } });
    expect(err("ES91 2100 0418 4502 0005 133.")).toMatchObject({ hint: "badChar", column: 29 });
  });

  it("demasiado corto para tener país y cifras", () => {
    expect(err("ES9")).toMatchObject({ hint: "tooShort", column: 4, params: { length: 3 } });
  });

  it("el país son dos letras y las cifras de control, dos números", () => {
    expect(err("E591 2100 0418 4502 0005 1332")).toMatchObject({ hint: "badCountry", column: 1 });
    expect(err("1291 2100 0418 4502 0005 1332")).toMatchObject({ hint: "badCountry" });
    expect(err("ES9A 2100 0418 4502 0005 1332")).toMatchObject({ hint: "badCheckDigits", column: 3 });
  });

  it("país desconocido, con el código", () => {
    expect(err("XX91 2100 0418 4502 0005 1332")).toMatchObject({ hint: "unknownCountry", column: 1, params: { country: "XX" } });
  });

  it("longitud: corto apunta al final, largo al primer carácter sobrante (contando espacios)", () => {
    expect(err("ES91 2100 0418")).toMatchObject({ hint: "badLength", column: 15, params: { country: "ES", expected: 24, length: 12 } });
    const long = `${ES}0`;
    expect(err(long)).toMatchObject({ hint: "badLength", column: long.length, params: { country: "ES", expected: 24, length: 25 } });
    // el sobrante tras un espacio de agrupación
    expect(err(`${ES} 0`)).toMatchObject({ hint: "badLength", column: ES.length + 2 });
  });

  it("varios: un error por línea con su valor", () => {
    const r = validateIbans(SAMPLE);
    expect(r.meta).toMatchObject({ total: 4, valid: 2, invalid: 2, breakdown: { ES: 1, DE: 1 } });
    expect(r.errors.map((e) => [e.line, e.hint])).toEqual([[2, "badChecksum"], [4, "badLength"]]);
  });

  it("todas las pistas posibles están cubiertas por estos tests", () => {
    const seen = new Set(
      ["", "ES91-2100", "ES9", "E591 2100 0418 4502 0005 1332", "ES9A 2100 0418 4502 0005 1332",
        "XX91 2100 0418 4502 0005 1332", "ES91 2100 0418", "ES91 2100 0418 4502 0005 1333"].map((v) => err(v).hint),
    );
    expect([...seen].sort()).toEqual([...IBAN_HINT_KEYS].sort());
  });
});
