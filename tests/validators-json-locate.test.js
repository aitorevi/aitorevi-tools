import { describe, it, expect } from "vitest";
import { locateJsonError } from "../lib/validators/json-locate.js";

describe("locateJsonError · posición del primer error", () => {
  // [texto, offset esperado]. Mismo criterio que "at position N" de V8:
  // el índice del primer carácter que no encaja.
  const cases = [
    ['{"a":1,}', 7],
    ["[1,2,]", 5],
    ['{"a":}', 5],
    ["{a:1}", 1],
    ["{'a':1}", 1],
    ["['a']", 1],
    ["[undefined]", 1],
    ['{"a":NaN}', 5],
    ["[1 2]", 3],
    ['{"a" 1}', 5],
    ['{"a":1 "b":2}', 7],
    ['{"a":1}x', 7],
    ['{"a":1} {"b":2}', 8],
    ['"a\nb"', 2],
    ['"\\x"', 2],
    ['{"a":"\\u12G4"}', 10],
    ["[01]", 2],
    ["[-]", 2],
    ["[1.]", 3],
    ["[1e]", 3],
    ["[tru]", 4],
    ["// x\n{}", 0],
    ['{"a":1 // c\n}', 7],
    ["hola", 0],
  ];
  for (const [text, offset] of cases) {
    it(`${JSON.stringify(text)} → ${offset}`, () => {
      expect(locateJsonError(text)).toBe(offset);
    });
  }

  it("en un JSON de varias líneas apunta al carácter exacto", () => {
    const text = '{\n  "a": 1,\n  "b": }';
    expect(locateJsonError(text)).toBe(text.lastIndexOf("}"));
  });

  it("texto que termina antes de tiempo → text.length", () => {
    for (const text of ['{"a":', "[1,2", '"abc', '{"a":[{"b":', '{"a":1,', "[1.", '"\\u12']) {
      expect(locateJsonError(text), text).toBe(text.length);
    }
  });

  it("texto que la gramática da por válido → null", () => {
    const valid = ['{"a":[1,{"b":null}],"c":"x\\n\\u00e9"}', "42", "-0.5e+10", " [ ] ", '"hola"', "true", "{}", '{"a":{}}', "[[],[{}]]"];
    for (const text of valid) expect(locateJsonError(text), text).toBeNull();
  });

  it("anidamiento muy profundo no desborda la pila", () => {
    const n = 200000;
    expect(locateJsonError("[".repeat(n))).toBe(n);
    expect(locateJsonError("[".repeat(n) + "]".repeat(n))).toBeNull();
  });
});

// Contraste con el JSON.parse real sobre textos mutados (generador con semilla fija).
describe("locateJsonError · contraste con JSON.parse", () => {
  const seed = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const rand = seed(20260611);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const BASE = [
    '{"name":"aitorevi","tools":["json","xml"],"meta":{"stars":42,"ok":true,"none":null,"pi":-3.14e+2}}',
    '[1,[2,[3,{"a":"x\\ny\\u00e9"}]],false,"fin"]',
    '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}',
  ];
  const NOISE = [...'{}[],:"\'\\ 019eE+-.tfnul\n/*\t#xN'];

  const mutate = (text) => {
    const i = Math.floor(rand() * (text.length + 1));
    const op = rand();
    if (op < 0.33) return text.slice(0, i) + text.slice(i + 1);
    if (op < 0.66) return text.slice(0, i) + pick(NOISE) + text.slice(i);
    return text.slice(0, i) + pick(NOISE) + text.slice(i + 1);
  };

  it("da null exactamente cuando JSON.parse acepta, y coincide con la posición del motor cuando la da", () => {
    let invalid = 0;
    let compared = 0;
    for (let k = 0; k < 6000; k++) {
      let text = pick(BASE);
      for (let m = 1 + Math.floor(rand() * 2); m > 0; m--) text = mutate(text);

      let engineError = null;
      try { JSON.parse(text); } catch (e) { engineError = e; }
      const located = locateJsonError(text);

      if (!engineError) {
        expect(located, JSON.stringify(text)).toBeNull();
        continue;
      }
      invalid++;
      expect(located, JSON.stringify(text)).not.toBeNull();
      const m = / in JSON at position (\d+)/.exec(engineError.message) || /^(?!.*is not valid JSON$).*\bat position (\d+)/s.exec(engineError.message);
      if (m && !/end of JSON input/.test(engineError.message)) {
        compared++;
        expect(located, `${JSON.stringify(text)} :: ${engineError.message}`).toBe(Number(m[1]));
      }
    }
    expect(invalid).toBeGreaterThan(1000);
    expect(compared).toBeGreaterThan(500);
  });
});
