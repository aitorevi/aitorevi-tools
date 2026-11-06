import { describe, it, expect } from "vitest";
import { validateJson } from "../lib/validators/json.js";
import { VALIDATORS, validate } from "../lib/validators/index.js";

// Estos tests usan el JSON.parse real del entorno. Los motores difieren en si dan
// posición, pero el localizador de respaldo la garantiza, así que se exige exacta.
// La normalización de cada formato de mensaje está en validators-json-errors.test.js.
const first = (input) => validateJson(input).errors[0];
const at = (error) => [error.offset, error.line, error.column];

describe("validateJson · válido", () => {
  it("objeto, array y anidado", () => {
    expect(validateJson('{"a":1}').valid).toBe(true);
    expect(validateJson("[1,2,3]").valid).toBe(true);
    expect(validateJson('{"a":{"b":[1,{"c":null}]}}').valid).toBe(true);
  });

  it("valores primitivos sueltos son JSON válido", () => {
    for (const input of ["42", '"hola"', "true", "false", "null", "-1.5e3"]) {
      expect(validateJson(input).valid, input).toBe(true);
    }
  });

  it("admite espacios y saltos de línea alrededor", () => {
    expect(validateJson('  \n\t{"a":1}\r\n ').valid).toBe(true);
  });

  it("devuelve la forma común { valid, errors, meta }", () => {
    expect(validateJson("{}")).toEqual({
      valid: true,
      errors: [],
      meta: { rootType: "object", keyCount: 0, depth: 1, hadBom: false },
    });
  });
});

describe("validateJson · meta", () => {
  it("tipo raíz", () => {
    const type = (s) => validateJson(s).meta.rootType;
    expect(type("{}")).toBe("object");
    expect(type("[]")).toBe("array");
    expect(type('"x"')).toBe("string");
    expect(type("42")).toBe("number");
    expect(type("true")).toBe("boolean");
    expect(type("null")).toBe("null");
  });

  it("cuenta las claves de todos los objetos, no solo las de la raíz", () => {
    expect(validateJson('{"a":1,"b":{"c":2,"d":[{"e":3}]}}').meta.keyCount).toBe(5);
    expect(validateJson("[1,2]").meta.keyCount).toBe(0);
  });

  it("profundidad máxima: primitivo 0, contenedor vacío 1", () => {
    const depth = (s) => validateJson(s).meta.depth;
    expect(depth("42")).toBe(0);
    expect(depth("{}")).toBe(1);
    expect(depth('{"a":{}}')).toBe(2);
    expect(depth('{"a":[[1]],"b":2}')).toBe(3);
  });

  it("no desborda la pila con anidamiento profundo", () => {
    const n = 5000;
    const result = validateJson("[".repeat(n) + "]".repeat(n));
    expect(result.valid).toBe(true);
    expect(result.meta.depth).toBe(n);
  });
});

describe("validateJson · entrada vacía", () => {
  it("vacía, solo espacios o solo BOM → inválida con pista 'empty'", () => {
    for (const input of ["", "   ", "\n\t \r\n", "﻿", "﻿  "]) {
      const r = validateJson(input);
      expect(r.valid, JSON.stringify(input)).toBe(false);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toMatchObject({ hint: "empty", offset: null, line: null, column: null });
    }
  });

  it("null y undefined se tratan como vacío", () => {
    expect(validateJson(null).errors[0].hint).toBe("empty");
    expect(validateJson(undefined).errors[0].hint).toBe("empty");
  });
});

describe("validateJson · BOM", () => {
  it("un BOM inicial se ignora y se anota en meta.hadBom", () => {
    const r = validateJson('﻿{"a":1}');
    expect(r.valid).toBe(true);
    expect(r.meta.hadBom).toBe(true);
    expect(r.meta.keyCount).toBe(1);
  });

  it("la posición de un error se refiere al texto original, BOM incluido", () => {
    const text = '﻿{"a":1,}';
    const e = first(text);
    expect(e.hint).toBe("trailingComma");
    // La coma final está en el índice 8 del texto original (7 sin el BOM).
    expect(at(e)).toEqual([8, 1, 9]);
    expect(text[e.offset]).toBe("}");
  });
});

describe("validateJson · errores típicos", () => {
  it("coma final en objeto", () => {
    const e = first('{"a":1,}');
    expect(e.hint).toBe("trailingComma");
    expect(at(e)).toEqual([7, 1, 8]);
  });

  it("coma final en array (V8 no da posición: la da el respaldo)", () => {
    const e = first("[1,2,]");
    expect(e.hint).toBe("trailingComma");
    expect(at(e)).toEqual([5, 1, 6]);
  });

  it("coma final en varias líneas", () => {
    const text = '{\n  "a": 1,\n}';
    const e = first(text);
    expect(e.hint).toBe("trailingComma");
    expect(at(e)).toEqual([12, 3, 1]);
  });

  it("comillas simples", () => {
    expect(first("{'a':1}").hint).toBe("singleQuotes");
    expect(first("['a']").hint).toBe("singleQuotes");
  });

  it("claves sin comillas", () => {
    expect(first("{a:1}").hint).toBe("unquotedKey");
  });

  it("comentarios", () => {
    expect(first('{"a":1 // x\n}').hint).toBe("comments");
    expect(first("// x\n{}").hint).toBe("comments");
    expect(first('{"a":1 /* x */}').hint).toBe("comments");
  });

  it("falta una coma", () => {
    expect(first('{"a":1 "b":2}').hint).toBe("missingComma");
    expect(first("[1 2]").hint).toBe("missingComma");
  });

  it("faltan los dos puntos", () => {
    expect(first('{"a" 1}').hint).toBe("missingColon");
  });

  it("errores sin posición en V8 (NaN, texto suelto, multilínea) también quedan localizados", () => {
    expect(at(first('{"a":NaN}'))).toEqual([5, 1, 6]);
    expect(at(first("hola"))).toEqual([0, 1, 1]);
    expect(at(first('{\n  "a": 1,\n  "b": }'))).toEqual([19, 3, 8]);
  });

  it("JSON incompleto: la posición es el final del texto", () => {
    expect(first('{"a":').hint).toBe("unexpectedEnd");
    expect(at(first('{"a":'))).toEqual([5, 1, 6]);
    expect(first('{"a":[1,2').hint).not.toBeNull();
  });

  it("cadena sin cerrar y salto de línea dentro de un texto", () => {
    expect(first('"abc').hint).toBe("unterminatedString");
    expect(first('"a\nb"').hint).toBe("controlChar");
  });

  it("NaN y undefined", () => {
    expect(first('{"a":NaN}').hint).toBe("nonJsonValue");
    expect(first("[undefined]").hint).toBe("nonJsonValue");
  });

  it("texto suelto que no es JSON: inválido sin pista", () => {
    const r = validateJson("hola");
    expect(r.valid).toBe(false);
    expect(r.errors[0].hint).toBeNull();
  });

  it("todo error cumple la forma común", () => {
    const e = first('{"a":1,}');
    expect(Object.keys(e).sort()).toEqual(["column", "hint", "line", "message", "offset"]);
    expect(typeof e.message).toBe("string");
  });
});

describe("registro de validadores", () => {
  it("json está registrado y validate() delega en él", () => {
    expect(VALIDATORS.json).toBe(validateJson);
    expect(validate("json", "[1]").valid).toBe(true);
    expect(validate("json", "[").valid).toBe(false);
  });

  it("un formato desconocido lanza", () => {
    expect(() => validate("nope", "x")).toThrow(/Unknown validator/);
  });
});
