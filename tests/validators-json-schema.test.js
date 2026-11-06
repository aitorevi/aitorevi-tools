import { describe, it, expect } from "vitest";
import { loadUMD } from "./_umd.js";
import {
  checkSchemaAndDocument,
  detectDraft,
  explainUnit,
  finishSchemaCheck,
  leafUnits,
  prepareSchemaCheck,
  resolveKeywordValue,
  validateJsonSchema,
} from "../lib/validators/json-schema.js";

const lib = loadUMD("vendor/json-schema.min.js", "JsonSchema");
const S = (schema) => JSON.stringify(schema, null, 2);
const run = (doc, schema) => validateJsonSchema(typeof doc === "string" ? doc : S(doc), typeof schema === "string" ? schema : S(schema), lib);
const D = "https://json-schema.org/draft/2020-12/schema";

describe("detectDraft", () => {
  it("2020-12 por defecto y según $schema", () => {
    expect(detectDraft({})).toEqual({ draft: "2020-12" });
    expect(detectDraft(true)).toEqual({ draft: "2020-12" });
    expect(detectDraft([])).toEqual({ draft: "2020-12" });
    expect(detectDraft({ $schema: "http://json-schema.org/draft-04/schema#" })).toEqual({ draft: "4" });
    expect(detectDraft({ $schema: "http://json-schema.org/draft-07/schema#" })).toEqual({ draft: "7" });
    expect(detectDraft({ $schema: "https://json-schema.org/draft/2019-09/schema" })).toEqual({ draft: "2019-09" });
    expect(detectDraft({ $schema: "https://json-schema.org/draft/2020-12/schema" })).toEqual({ draft: "2020-12" });
  });

  it("acepta http/https y la almohadilla final", () => {
    expect(detectDraft({ $schema: "https://json-schema.org/draft-07/schema" })).toEqual({ draft: "7" });
    expect(detectDraft({ $schema: "http://json-schema.org/draft/2020-12/schema#" })).toEqual({ draft: "2020-12" });
  });

  it("un draft que no soporta la librería (draft-06) o desconocido → unsupported", () => {
    expect(detectDraft({ $schema: "http://json-schema.org/draft-06/schema#" })).toEqual({ unsupported: "http://json-schema.org/draft-06/schema#" });
    expect(detectDraft({ $schema: "https://ejemplo.com/mi-schema" })).toEqual({ unsupported: "https://ejemplo.com/mi-schema" });
  });
});

describe("validateJsonSchema · documento válido", () => {
  it("cumple el schema: meta con draft, tipo raíz, claves y profundidad", () => {
    const r = run({ nombre: "Ana", edad: 30 }, { $schema: D, type: "object", required: ["nombre"], properties: { edad: { type: "integer" } } });
    expect(r).toEqual({ valid: true, errors: [], meta: { stage: "valid", draft: "2020-12", rootType: "object", keyCount: 2, depth: 1 } });
  });

  it("schema vacío y schema true aceptan cualquier cosa", () => {
    expect(run(5, {}).valid).toBe(true);
    expect(run("[1,2]", "true").valid).toBe(true);
  });
});

describe("validateJsonSchema · errores del documento", () => {
  const schema = {
    $schema: D,
    type: "object",
    required: ["usuarios", "version"],
    properties: {
      version: { type: "integer", minimum: 1 },
      usuarios: { type: "array", minItems: 1, items: { $ref: "#/$defs/u" } },
    },
    additionalProperties: false,
    $defs: {
      u: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          edad: { type: "number", maximum: 120 },
          tipo: { enum: ["a", "b"] },
          n: { type: "string", pattern: "^[a-z]+$", minLength: 3 },
        },
      },
    },
  };
  const docText = S({ version: 0, extra: 1, usuarios: [{ email: "no-es-email", edad: 130, tipo: "z", n: "AB" }, { edad: 1 }] });
  const r = run(docText, schema);
  const byPath = (path, hint) => r.errors.find((e) => e.path === path && e.hint === hint);

  it("deja solo los errores útiles (sin contenedores) y marca la etapa", () => {
    expect(r.valid).toBe(false);
    expect(r.meta).toEqual({ stage: "validation", draft: "2020-12" });
    expect(r.errors.map((e) => `${e.path}|${e.hint}`)).toEqual([
      "/version|kw_minimum",
      "/usuarios/0/email|kw_format",
      "/usuarios/0/edad|kw_maximum",
      "/usuarios/0/tipo|kw_enum",
      "/usuarios/0/n|kw_minLength",
      "/usuarios/0/n|kw_pattern",
      "/usuarios/1|kw_required",
      "/extra|kw_notAllowed",
    ]);
    expect(r.errors.every((e) => e.source === "document")).toBe(true);
  });

  it("cada error lleva su posición exacta en el texto del documento", () => {
    const where = (path, hint, needle, from = 0) => {
      const e = byPath(path, hint);
      expect(e.offset, `${path} ${hint}`).toBe(docText.indexOf(needle, from));
      return e;
    };
    where("/version", "kw_minimum", "0,\n");
    where("/usuarios/0/email", "kw_format", '"no-es-email"');
    where("/usuarios/0/edad", "kw_maximum", "130");
    where("/usuarios/0/tipo", "kw_enum", '"z"');
    where("/usuarios/0/n", "kw_minLength", '"AB"');
    where("/usuarios/1", "kw_required", "{", docText.indexOf('"edad": 1') - 12);
    // un campo no permitido apunta a su CLAVE, no a su valor
    where("/extra", "kw_notAllowed", '"extra"');
  });

  it("línea y columna coinciden con el offset", () => {
    const e = byPath("/usuarios/0/email", "kw_format");
    const before = docText.slice(0, e.offset).split("\n");
    expect([e.line, e.column]).toEqual([before.length, before[before.length - 1].length + 1]);
  });

  it("parámetros de las pistas", () => {
    expect(byPath("/version", "kw_minimum").params).toEqual({ value: "0", limit: "1" });
    expect(byPath("/usuarios/0/email", "kw_format").params).toEqual({ format: "email" });
    expect(byPath("/usuarios/0/tipo", "kw_enum").params).toEqual({ list: '"a", "b"' });
    expect(byPath("/usuarios/0/n", "kw_minLength").params).toEqual({ length: "2", limit: "3" });
    expect(byPath("/usuarios/1", "kw_required").params).toEqual({ property: "email" });
    expect(byPath("/extra", "kw_notAllowed").params).toEqual({ property: "extra" });
  });

  it("el pattern se resuelve aunque esté detrás de un $ref", () => {
    expect(byPath("/usuarios/0/n", "kw_pattern").params).toEqual({ pattern: "^[a-z]+$" });
  });
});

describe("validateJsonSchema · una pista por palabra clave", () => {
  const one = (schema, doc) => {
    // `run` trata las cadenas como texto JSON: un valor de tipo texto se serializa antes.
    const r = run(typeof doc === "string" ? JSON.stringify(doc) : doc, { $schema: D, ...schema });
    expect(r.valid).toBe(false);
    return r.errors;
  };

  const cases = [
    ["type", { type: "string" }, 1, "kw_type", { actual: "number", expected: "string" }],
    ["type lista", { type: ["string", "null"] }, 1, "kw_type", { actual: "number", expected: "string, null" }],
    ["integer", { type: "integer" }, 1.5, "kw_type", { actual: "number", expected: "integer" }],
    ["const", { const: "x" }, "y", "kw_const", { value: '"x"' }],
    ["minimum", { minimum: 10 }, 3, "kw_minimum", { value: "3", limit: "10" }],
    ["maximum", { maximum: 10 }, 30, "kw_maximum", { value: "30", limit: "10" }],
    ["exclusiveMinimum", { exclusiveMinimum: 5 }, 5, "kw_exclusiveMinimum", { value: "5", limit: "5" }],
    ["exclusiveMaximum", { exclusiveMaximum: 5 }, 5, "kw_exclusiveMaximum", { value: "5", limit: "5" }],
    ["multipleOf", { multipleOf: 5 }, 7, "kw_multipleOf", { value: "7", limit: "5" }],
    ["maxLength", { maxLength: 2 }, "abc", "kw_maxLength", { length: "3", limit: "2" }],
    ["minItems", { minItems: 2 }, [1], "kw_minItems", { length: "1", limit: "2" }],
    ["maxItems", { maxItems: 1 }, [1, 2], "kw_maxItems", { length: "2", limit: "1" }],
    ["uniqueItems", { uniqueItems: true }, [1, 1], "kw_uniqueItems", { a: "0", b: "1" }],
    ["minProperties", { minProperties: 2 }, { a: 1 }, "kw_minProperties", { limit: "2" }],
    ["maxProperties", { maxProperties: 1 }, { a: 1, b: 2 }, "kw_maxProperties", { limit: "1" }],
    ["contains", { contains: { type: "string" } }, [1], "kw_contains", {}],
    ["dependentRequired", { dependentRequired: { a: ["b"] } }, { a: 1 }, "kw_dependentRequired", { property: "a", needs: "b" }],
    ["propertyNames", { propertyNames: { pattern: "^a" } }, { b: 1 }, "kw_propertyNames", { property: "b" }],
    ["not", { not: { type: "string" } }, "x", "kw_not", {}],
    ["oneOf", { oneOf: [{ type: "number" }, { minimum: 0 }] }, 3, "kw_oneOf", { matches: "2" }],
    ["format uuid", { format: "uuid" }, "x", "kw_format", { format: "uuid" }],
  ];
  for (const [name, schema, doc, hint, params] of cases) {
    it(`${name} → ${hint}`, () => {
      const errors = one(schema, doc);
      expect(errors).toHaveLength(1);
      expect(errors[0].hint).toBe(hint);
      expect(errors[0].params).toEqual(params);
    });
  }

  it("las alternativas de anyOf no se listan: queda un solo error", () => {
    const errors = one({ anyOf: [{ type: "string" }, { type: "number", minimum: 10 }] }, 3);
    expect(errors.map((e) => e.hint)).toEqual(["kw_anyOf"]);
  });

  it("if/then: el error está en lo que exige 'then'", () => {
    const errors = one({ if: { properties: { a: { const: 1 } } }, then: { required: ["b"] } }, { a: 1 });
    expect(errors.map((e) => e.hint)).toEqual(["kw_required"]);
  });

  it("additionalProperties con un schema: el error es el de la propiedad", () => {
    const errors = one({ type: "object", additionalProperties: { type: "string" } }, { z: 1 });
    expect(errors.map((e) => [e.path, e.hint])).toEqual([["/z", "kw_type"]]);
  });

  it("unevaluatedProperties: false → propiedad no permitida, apuntando a la clave", () => {
    const text = S({ a: 1, z: 2 });
    const r = run(text, { $schema: D, type: "object", properties: { a: {} }, unevaluatedProperties: false });
    expect(r.errors.map((e) => [e.path, e.hint])).toEqual([["/z", "kw_notAllowed"]]);
    expect(r.errors[0].offset).toBe(text.indexOf('"z"'));
  });

  it("propertyNames apunta a la clave inválida", () => {
    const text = S({ a: 1, bad: 2 });
    const r = run(text, { $schema: D, propertyNames: { pattern: "^a" } });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].offset).toBe(text.indexOf('"bad"'));
  });

  it("los mensajes técnicos erróneos de la librería se corrigen", () => {
    expect(one({ maxProperties: 1 }, { a: 1, b: 2 })[0].message).toBe("Instance has more than 1 properties.");
    expect(one({ exclusiveMinimum: 5 }, 5)[0].message).toBe("5 is not greater than 5.");
  });

  it("una palabra clave sin pista conserva el mensaje técnico y no inventa pista", () => {
    const r = validateJsonSchema("5", S({ $schema: D, $anchor: "x", type: "string" }), lib);
    expect(r.errors[0].hint).toBe("kw_type"); // sanity
    const e = explainUnit({ keyword: "raro", instanceLocation: "#", keywordLocation: "#/raro", error: "algo" }, {}, "validation");
    expect(e).toEqual({ hint: null, params: undefined, message: "algo" });
  });

  it("si no se pueden sacar los parámetros del mensaje, no hay pista", () => {
    const e = explainUnit({ keyword: "type", instanceLocation: "#", keywordLocation: "#/type", error: "mensaje inesperado" }, {}, "validation");
    expect(e.hint).toBeNull();
  });
});

describe("validateJsonSchema · rutas y posiciones difíciles", () => {
  it("claves con barra, tilde, espacio y unicode", () => {
    const text = S({ "a/b~c d": 5, ñandú: "x" });
    const r = run(text, { $schema: D, properties: { "a/b~c d": { type: "string" }, ñandú: { type: "number" } } });
    expect(r.errors.map((e) => e.path)).toEqual(["/a~1b~0c d", "/ñandú"]);
    expect(r.errors[0].offset).toBe(text.indexOf("5"));
    expect(r.errors[1].offset).toBe(text.indexOf('"x"'));
  });

  it("clave con porcentaje", () => {
    const text = S({ "100%": "x" });
    const r = run(text, { $schema: D, properties: { "100%": { type: "number" } } });
    expect(r.errors[0].path).toBe("/100%");
    expect(r.errors[0].offset).toBe(text.indexOf('"x"'));
  });

  it("claves duplicadas: se valida y se señala el último valor, como JSON.parse", () => {
    const text = '{"a": "ok", "a": 5}';
    const r = run(text, { $schema: D, properties: { a: { type: "string" } } });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].offset).toBe(text.lastIndexOf("5"));
  });

  it("documento de raíz primitiva: la ruta es vacía", () => {
    const r = run("5", { $schema: D, type: "string" });
    expect(r.errors[0]).toMatchObject({ path: "", offset: 0, line: 1, column: 1 });
  });

  it("BOM en el documento: las posiciones son del texto original", () => {
    const text = '﻿{"a": 5}';
    const r = run(text, { $schema: D, properties: { a: { type: "string" } } });
    expect(r.errors[0].offset).toBe(text.indexOf("5"));
    expect(r.errors[0].column).toBe(text.indexOf("5") + 1);
  });
});

describe("validateJsonSchema · el propio schema", () => {
  const bad = (schema, draftUrl = D) => run("{}", typeof schema === "string" ? schema : { $schema: draftUrl, ...schema });

  it("un schema incorrecto se detecta antes de usarlo, con ruta y posición en el schema", () => {
    const schemaText = S({ $schema: D, type: "object", properties: 5, required: "x" });
    const r = run("{}", schemaText);
    expect(r.valid).toBe(false);
    expect(r.meta).toEqual({ stage: "schema", draft: "2020-12" });
    expect(r.errors.every((e) => e.source === "schema")).toBe(true);
    const props = r.errors.find((e) => e.path === "/properties");
    expect(props.offset).toBe(schemaText.indexOf("5"));
    expect(props.hint).toBe("kw_type");
    expect(r.errors.find((e) => e.path === "/required").hint).toBe("kw_type");
  });

  it("type mal escrito → pista específica del schema", () => {
    const r = bad({ type: "strin" });
    expect(r.errors.map((e) => [e.path, e.hint])).toEqual([["/type", "schema_type"]]);
  });

  for (const [draft, url] of [
    ["4", "http://json-schema.org/draft-04/schema#"],
    ["7", "http://json-schema.org/draft-07/schema#"],
    ["2019-09", "https://json-schema.org/draft/2019-09/schema"],
    ["2020-12", D],
  ]) {
    it(`draft ${draft}: schema válido pasa y uno con errores no`, () => {
      expect(run("1", { $schema: url, type: "number" }).meta.draft).toBe(draft);
      const r = bad({ type: "number", minimum: "x" }, url);
      expect(r.meta).toEqual({ stage: "schema", draft });
      expect(r.errors.some((e) => e.path === "/minimum")).toBe(true);
    });
  }

  it("un schema que no es un objeto ni booleano es inválido", () => {
    expect(run("{}", "5").meta.stage).toBe("schema");
    expect(run("{}", "[1]").meta.stage).toBe("schema");
  });

  it("draft no soportado → error del schema apuntando a $schema", () => {
    const r = run("{}", { $schema: "http://json-schema.org/draft-06/schema#" });
    expect(r.errors[0]).toMatchObject({ hint: "unsupportedDraft", source: "schema", path: "/$schema", params: { schema: "http://json-schema.org/draft-06/schema#" } });
  });

  it("BOM en el schema: las posiciones del error del schema son del texto original", () => {
    const text = "﻿" + S({ $schema: D, type: "strin" });
    const r = run("{}", text);
    expect(r.errors[0].offset).toBe(text.indexOf('"strin"'));
  });
});

describe("validateJsonSchema · excepciones de la librería", () => {
  const thrown = (schema, doc = "{}") => run(doc, { $schema: D, ...schema });

  it("$ref sin resolver: pista con la referencia y sin ruido interno", () => {
    const r = thrown({ properties: { a: { $ref: "#/$defs/nope" } } }, '{"a":1}');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ hint: "unresolvedRef", source: "schema", params: { ref: "#/$defs/nope" } });
    expect(r.errors[0].message).not.toContain("Known schemas");
    expect(r.errors[0].message).not.toContain("github.com/cfworker");
  });

  it("$ref remoto: no se descarga; es la misma pista", () => {
    const r = thrown({ properties: { a: { $ref: "https://example.com/s.json" } } }, '{"a":1}');
    expect(r.errors[0]).toMatchObject({ hint: "unresolvedRef", params: { ref: "https://example.com/s.json" } });
  });

  it("regex inválida en pattern: la detecta el metaschema, con su posición en el schema", () => {
    const schemaText = S({ $schema: D, type: "string", pattern: "(" });
    const r = run('"x"', schemaText);
    expect(r.meta.stage).toBe("schema");
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ hint: "schema_regex", source: "schema", path: "/pattern", offset: schemaText.indexOf('"("') });
  });

  it("una excepción de regex que se escape al metaschema también se traduce", () => {
    const ctx = prepareSchemaCheck('"x"', S({ type: "string" })).ctx;
    const raw = { stage: "thrown", thrown: { name: "SyntaxError", message: "Invalid regular expression: /(/u: Unterminated group" } };
    const r = finishSchemaCheck(ctx, raw);
    expect(r.errors[0]).toMatchObject({ hint: "badPattern", source: "schema", params: { reason: "/(/u: Unterminated group" } });
  });

  it("$ref circular", () => {
    const r = thrown({ $defs: { a: { $ref: "#/$defs/a" } }, $ref: "#/$defs/a" }, "1");
    expect(r.errors[0]).toMatchObject({ hint: "circularRef", source: "schema" });
  });
});

describe("validateJsonSchema · sintaxis y textos vacíos", () => {
  it("los dos vacíos → stage 'empty' sin errores", () => {
    expect(validateJsonSchema("", "  ", lib)).toEqual({ valid: false, errors: [], meta: { stage: "empty" } });
  });

  it("falta uno de los dos → pista emptyDocument / emptySchema", () => {
    const noSchema = validateJsonSchema("{}", "", lib);
    expect(noSchema.meta.stage).toBe("missing");
    expect(noSchema.errors).toHaveLength(1);
    expect(noSchema.errors[0]).toMatchObject({ source: "schema", hint: "emptySchema" });
    const noDoc = validateJsonSchema("", "{}", lib);
    expect(noDoc.errors[0]).toMatchObject({ source: "document", hint: "emptyDocument" });
  });

  it("JSON mal escrito en el documento y/o en el schema: errores de sintaxis con su origen y posición", () => {
    const r = validateJsonSchema('{"a":1,}', '{"type":}', lib);
    expect(r.meta.stage).toBe("syntax");
    expect(r.errors.map((e) => e.source)).toEqual(["schema", "document"]);
    expect(r.errors[1]).toMatchObject({ hint: "trailingComma", line: 1, column: 8 });
  });
});

describe("leafUnits y resolveKeywordValue", () => {
  it("leafUnits descarta contenedores y subesquemas de alternativas, sin perder el orden", () => {
    const u = (keyword, keywordLocation) => ({ keyword, keywordLocation, instanceLocation: "#", error: "" });
    const out = leafUnits([
      u("properties", "#/properties"),
      u("anyOf", "#/p/anyOf"),
      u("type", "#/p/anyOf/0/type"),
      u("minimum", "#/p/anyOf/1/minimum"),
      u("required", "#/required"),
    ]);
    expect(out.map((x) => x.keyword)).toEqual(["anyOf", "required"]);
  });

  it("resolveKeywordValue sigue $ref locales y devuelve undefined con los remotos", () => {
    const schema = { $defs: { u: { pattern: "^a" } }, properties: { x: { $ref: "#/$defs/u" }, y: { $ref: "http://e.com/s" } } };
    expect(resolveKeywordValue(schema, "#/properties/x/$ref/pattern")).toBe("^a");
    expect(resolveKeywordValue(schema, "#/properties/y/$ref/pattern")).toBeUndefined();
  });
});

describe("rendimiento", () => {
  it("muchos errores en un documento grande: el índice de rutas se construye una vez", () => {
    const items = Array.from({ length: 4000 }, (_, i) => ({ id: "x" + i, name: "n" + i }));
    const text = S(items);
    const t0 = performance.now();
    const r = run(text, { $schema: D, type: "array", items: { type: "object", properties: { id: { type: "integer" } } } });
    expect(r.errors).toHaveLength(4000);
    expect(performance.now() - t0).toBeLessThan(4000);
    expect(r.errors[3999].path).toBe("/3999/id");
  });
});

describe("prepare / check / finish por separado (como en el Worker)", () => {
  it("el resultado es el mismo que el del flujo en un solo hilo", () => {
    const docText = S({ a: 1 });
    const schemaText = S({ $schema: D, properties: { a: { type: "string" } } });
    const prep = prepareSchemaCheck(docText, schemaText);
    const raw = JSON.parse(JSON.stringify(checkSchemaAndDocument(lib, prep.run.schema, prep.run.doc, prep.run.draft))); // lo que viaja por postMessage
    expect(finishSchemaCheck(prep.ctx, raw)).toEqual(run(docText, schemaText));
  });
});
