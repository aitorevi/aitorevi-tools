import { describe, it, expect } from "vitest";
import { normalizeJsonError } from "../lib/validators/json.js";

// Mensajes nativos tal como los dan los motores, como datos fijos: así se prueban
// los tres formatos sin depender del navegador en el que corra el test.
const err = (message) => new SyntaxError(message);
const at = (e, text) => {
  const n = normalizeJsonError(e, text);
  return [n.offset, n.line, n.column];
};

describe("normalizeJsonError · posición", () => {
  it("Chrome/Node actual: 'at position N (line X column Y)'", () => {
    const e = err("Expected double-quoted property name in JSON at position 7 (line 1 column 8)");
    expect(at(e, '{"a":1,}')).toEqual([7, 1, 8]);
  });

  it("Chrome/Node con solo 'at position N': deduce línea y columna del texto", () => {
    const e = err("Expected ',' or '}' after property value in JSON at position 13");
    expect(at(e, '{\n  "a": 1\n  "b": 2}')).toEqual([13, 3, 3]);
  });

  it("Chrome antiguo: 'Unexpected token } in JSON at position N'", () => {
    expect(at(err("Unexpected token } in JSON at position 7"), '{"a":1,}')).toEqual([7, 1, 8]);
  });

  it("Firefox: solo 'line X column Y of the JSON data' → calcula el offset", () => {
    const e = err("JSON.parse: expected double-quoted property name at line 3 column 1 of the JSON data");
    expect(at(e, '{\n  "a": 1,\n}')).toEqual([12, 3, 1]);
  });

  it("Firefox con un fin de datos en una línea posterior", () => {
    const e = err("JSON.parse: unexpected end of data at line 2 column 6 of the JSON data");
    expect(at(e, '{\n"a":1')).toEqual([7, 2, 6]);
  });

  it("Safari: sin posición del motor → la localiza el respaldo", () => {
    expect(at(err("JSON Parse error: Unexpected token '}'"), '{"a":1,}')).toEqual([7, 1, 8]);
    expect(at(err("JSON Parse error: Unexpected EOF"), '{"a":')).toEqual([5, 1, 6]);
  });

  it("Chrome sin posición ('is not valid JSON') → la localiza el respaldo", () => {
    expect(at(err(`Unexpected token ']', "[1,2,]" is not valid JSON`), "[1,2,]")).toEqual([5, 1, 6]);
    expect(at(err("Unexpected end of JSON input"), '{"a":')).toEqual([5, 1, 6]);
  });

  it("en varias líneas el respaldo da línea y columna correctas", () => {
    const text = '{\n  "a": 1,\n  "b": }';
    expect(at(err(`Unexpected token '}', ..."1,\n  "b": }" is not valid JSON`), text)).toEqual([19, 3, 8]);
  });

  it("si el texto es válido para la gramática, el respaldo no inventa posición", () => {
    expect(at(err("JSON Parse error: Unexpected token '}'"), "{}")).toEqual([null, null, null]);
  });

  it("no toma como posición un 'at position N' que venga dentro del fragmento del usuario", () => {
    const text = '["at position 9" x]';
    const e = err(`Unexpected token 'x', ..."osition 9" x]" is not valid JSON`);
    const x = text.indexOf("x");
    expect(at(e, text)).toEqual([x, 1, x + 1]); // la 'x', no el 9 del fragmento
  });

  it("posición fuera del texto → todo null", () => {
    expect(at(err("Unexpected token } in JSON at position 99"), "{}")).toEqual([null, null, null]);
    expect(at(err("JSON.parse: unexpected character at line 5 column 1 of the JSON data"), "{}")).toEqual([null, null, null]);
  });

  it("error que no es un SyntaxError (p. ej. pila agotada) → sin posición", () => {
    const n = normalizeJsonError(new RangeError("Maximum call stack size exceeded"), "[[[");
    expect(n.offset).toBeNull();
    expect(n.message).toBe("Maximum call stack size exceeded");
  });
});

describe("normalizeJsonError · mensaje", () => {
  it("quita la posición, el prefijo del motor y el fragmento", () => {
    const msg = (m, t = "{}") => normalizeJsonError(err(m), t).message;
    expect(msg("Expected double-quoted property name in JSON at position 7 (line 1 column 8)", '{"a":1,}')).toBe(
      "Expected double-quoted property name"
    );
    expect(msg("Unexpected token } in JSON at position 7", '{"a":1,}')).toBe("Unexpected token }");
    expect(msg(`Unexpected token ']', "[1,2,]" is not valid JSON`)).toBe("Unexpected token ']'");
    expect(msg("JSON.parse: expected double-quoted property name at line 1 column 2 of the JSON data")).toBe(
      "Expected double-quoted property name"
    );
    expect(msg("JSON Parse error: Unexpected token '}'")).toBe("Unexpected token '}'");
  });
});

describe("normalizeJsonError · pista", () => {
  const hint = (message, text) => normalizeJsonError(err(message), text).hint;

  it("coma final: con posición", () => {
    expect(hint("Expected double-quoted property name in JSON at position 7", '{"a":1,}')).toBe("trailingComma");
    expect(hint("JSON.parse: unexpected character at line 1 column 6 of the JSON data", "[1,2,]")).toBe("trailingComma");
  });

  it("coma final: sin posición, por el carácter que nombra el motor", () => {
    expect(hint(`Unexpected token ']', "[1,2,]" is not valid JSON`, "[1,2,]")).toBe("trailingComma");
    expect(hint("JSON Parse error: Unexpected token '}'", '{"a":1,\n}')).toBe("trailingComma");
  });

  it("sin posición y sin el patrón típico no aventura la pista", () => {
    expect(hint(`Unexpected token '}', "{"a":}" is not valid JSON`, '{"a":}')).toBeNull();
  });

  it("comillas simples", () => {
    expect(hint("Expected property name or '}' in JSON at position 1", "{'a':1}")).toBe("singleQuotes");
    expect(hint(`Unexpected token ''', "['a']" is not valid JSON`, "['a']")).toBe("singleQuotes");
  });

  it("clave sin comillas", () => {
    expect(hint("Expected property name or '}' in JSON at position 1", "{a:1}")).toBe("unquotedKey");
  });

  it("comentarios: con y sin posición, y cuando el motor dice 'falta coma'", () => {
    expect(hint("Expected ',' or '}' after property value in JSON at position 7", '{"a":1 // x\n}')).toBe("comments");
    expect(hint(`Unexpected token '/', "// x\n{}" is not valid JSON`, "// x\n{}")).toBe("comments");
    expect(hint("Unexpected token / in JSON at position 0", "/* x */ {}")).toBe("comments");
  });

  it("falta una coma entre elementos", () => {
    expect(hint("Expected ',' or '}' after property value in JSON at position 7", '{"a":1 "b":2}')).toBe("missingComma");
    expect(hint("Expected ',' or ']' after array element in JSON at position 3", "[1 2]")).toBe("missingComma");
  });

  it("faltan los dos puntos", () => {
    expect(hint("Expected ':' after property name in JSON at position 5", '{"a" 1}')).toBe("missingColon");
  });

  it("NaN, Infinity y undefined", () => {
    expect(hint(`Unexpected token 'N', "{"a":NaN}" is not valid JSON`, '{"a":NaN}')).toBe("nonJsonValue");
    expect(hint(`Unexpected token 'u', "[undefined]" is not valid JSON`, "[undefined]")).toBe("nonJsonValue");
    expect(hint("Unexpected token u in JSON at position 1", "[undefined]")).toBe("nonJsonValue");
  });

  it("final inesperado, cadena sin cerrar, salto dentro de texto y escape inválido", () => {
    expect(hint("Unexpected end of JSON input", '{"a":')).toBe("unexpectedEnd");
    expect(hint("JSON.parse: unexpected end of data at line 1 column 6 of the JSON data", '{"a":')).toBe("unexpectedEnd");
    expect(hint("JSON Parse error: Unexpected EOF", '{"a":')).toBe("unexpectedEnd");
    expect(hint("Unterminated string in JSON at position 4", '"abc')).toBe("unterminatedString");
    expect(hint("Bad control character in string literal in JSON at position 2", '"a\nb"')).toBe("controlChar");
    expect(hint("Bad escaped character in JSON at position 2", '"\\x"')).toBe("badEscape");
  });

  it("contenido extra tras el JSON", () => {
    expect(hint("Unexpected non-whitespace character after JSON at position 7", '{"a":1}x')).toBe("extraContent");
  });

  it("sin pista para errores que no reconoce", () => {
    expect(hint("Unexpected number in JSON at position 2", "[01]")).toBeNull();
  });
});
