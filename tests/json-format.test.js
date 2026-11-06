import { describe, it, expect } from "vitest";
import { formatJson, minifyJson } from "../lib/json-format.js";

describe("formatJson · estilo", () => {
  it("coincide con JSON.stringify(v, null, 2) en JSON canónico", () => {
    const samples = [
      '{"a":1,"b":[2,3],"c":{"d":null,"e":[true,false]}}',
      '[1,[2,[3,{"a":[]}]],{}]',
      '{"a":{},"b":[],"c":[{}],"d":[[]]}',
      '"hola"',
      "42",
      "null",
      "[]",
      "{}",
    ];
    for (const s of samples) expect(formatJson(s), s).toBe(JSON.stringify(JSON.parse(s), null, 2));
  });

  it("respeta la sangría pedida", () => {
    expect(formatJson('{"a":[1]}', 4)).toBe('{\n    "a": [\n        1\n    ]\n}');
  });

  it("normaliza el espacio en blanco de entrada", () => {
    expect(formatJson('  {\n\t"a" :\r\n1 ,"b":  [ 2 ]  }  ')).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
  });

  it("es idempotente", () => {
    const once = formatJson('{"a":[1,{"b":2}],"c":"x"}');
    expect(formatJson(once)).toBe(once);
  });

  it("no confunde la puntuación que va dentro de una cadena", () => {
    const s = '{"k,:{}[]":"v,:{}[]","q":"a\\"b","back":"x\\\\"}';
    const out = formatJson(s);
    expect(out).toBe('{\n  "k,:{}[]": "v,:{}[]",\n  "q": "a\\"b",\n  "back": "x\\\\"\n}');
    expect(JSON.parse(out)).toEqual(JSON.parse(s));
  });
});

describe("formatJson / minifyJson · sin alterar los datos", () => {
  it("enteros grandes: no pierde precisión", () => {
    const s = '{"id":12345678901234567890,"neg":-9007199254740993}';
    expect(formatJson(s)).toContain("12345678901234567890");
    expect(formatJson(s)).toContain("-9007199254740993");
    expect(minifyJson(s)).toBe(s);
  });

  it("conserva la forma exacta de los números: 1.0, 1E+2, -0, 0.10", () => {
    const s = "[1.0,1E+2,-0,0.10,1e-7]";
    expect(minifyJson(s)).toBe(s);
    expect(formatJson(s)).toBe("[\n  1.0,\n  1E+2,\n  -0,\n  0.10,\n  1e-7\n]");
  });

  it("conserva las claves duplicadas y su orden", () => {
    const s = '{"b":1,"a":2,"b":3}';
    expect(minifyJson(s)).toBe(s);
    expect(formatJson(s)).toBe('{\n  "b": 1,\n  "a": 2,\n  "b": 3\n}');
  });

  it("conserva los escapes tal cual: \\u00e9, \\/, \\n", () => {
    const s = '{"a":"caf\\u00e9 \\/ x\\ny"}';
    expect(minifyJson(s)).toBe(s);
    expect(formatJson(s)).toContain('"caf\\u00e9 \\/ x\\ny"');
  });

  it("conserva los caracteres no ASCII y los espacios dentro de cadenas", () => {
    const s = '{"a":"  ñ 😀 \t "}'.replace("\t", "\\t");
    expect(minifyJson(s)).toBe(s);
  });

  it("minify(format(x)) === minify(x) y format(minify(x)) === format(x)", () => {
    const s = '{ "a" : [ 1.50 , { "b" : 12345678901234567890 } ] , "a" : "x" }';
    expect(minifyJson(formatJson(s))).toBe(minifyJson(s));
    expect(formatJson(minifyJson(s))).toBe(formatJson(s));
  });

  it("los valores no cambian: JSON.parse del resultado es igual al del original", () => {
    const s = '{"a":[1,2.5,"x",null,true,{"b":{}}],"c":"\\u00e9"}';
    expect(JSON.parse(formatJson(s))).toEqual(JSON.parse(s));
    expect(JSON.parse(minifyJson(s))).toEqual(JSON.parse(s));
  });
});

describe("formatJson / minifyJson · entrada inválida", () => {
  it("lanza SyntaxError si el JSON no es válido", () => {
    for (const bad of ["", "{", '{"a":1,}', "[1 2]", "hola"]) {
      expect(() => formatJson(bad), bad).toThrow(SyntaxError);
      expect(() => minifyJson(bad), bad).toThrow(SyntaxError);
    }
  });
});

describe("formatJson · contraste con el motor", () => {
  // Para JSON canónico (el que sale de JSON.stringify) el resultado debe ser
  // idéntico al del formateador nativo; solo difiere cuando el nativo altera datos.
  const seed = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const rand = seed(7);
  const gen = (d) => {
    const r = rand();
    if (d > 3 || r < 0.3) return [0, 1, -2.5, "txt", "a\"b\\c\né", true, false, null, 1e21, 0.1][Math.floor(rand() * 10)];
    if (r < 0.65) return Array.from({ length: Math.floor(rand() * 4) }, () => gen(d + 1));
    return Object.fromEntries(Array.from({ length: Math.floor(rand() * 4) }, (_, i) => [`k${i}`, gen(d + 1)]));
  };

  it("500 documentos aleatorios: igual que JSON.stringify(…, null, 2) y minify igual que JSON.stringify", () => {
    for (let k = 0; k < 500; k++) {
      const value = gen(0);
      const minified = JSON.stringify(value);
      expect(formatJson(minified)).toBe(JSON.stringify(value, null, 2));
      expect(minifyJson(JSON.stringify(value, null, 3))).toBe(minified);
    }
  });
});
