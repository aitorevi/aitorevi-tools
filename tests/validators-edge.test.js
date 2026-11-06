import { describe, it, expect } from "vitest";
import { loadUMD } from "./_umd.js";
import { locateJsonError } from "../lib/validators/json-locate.js";
import { normalizeJsonError, validateJson } from "../lib/validators/json.js";
import { normalizeYamlError, validateYaml } from "../lib/validators/yaml.js";
import { normalizeTomlError } from "../lib/validators/toml.js";
import { findParserError } from "../lib/validators/xml.js";
import { checkSchemaAndDocument, explainUnit, prepareSchemaCheck, resolveKeywordValue, validateJsonSchema } from "../lib/validators/json-schema.js";
import { createSchemaChecker } from "../validar-json/schema-client.js";
import { SAMPLE as JSON_SAMPLE, SCHEMA_SAMPLE } from "../validar-json/lib.js";
import { SAMPLE as YAML_SAMPLE } from "../validar-yaml/lib.js";
import { SAMPLE as TOML_SAMPLE } from "../validar-toml/lib.js";
import { SAMPLE as XML_SAMPLE } from "../validar-xml/lib.js";
import { validateYaml as vy } from "../lib/validators/yaml.js";
import { validateToml } from "../lib/validators/toml.js";

const lib = loadUMD("vendor/json-schema.min.js", "JsonSchema");
const jsyaml = loadUMD("vendor/js-yaml.min.js", "jsyaml");
const smol = loadUMD("vendor/smol-toml.min.js", "SmolTOML");

describe("json-locate · finales de texto dentro de cada construcción", () => {
  it("un escape, un número o un literal cortados por el final → text.length", () => {
    for (const text of ['"ab\\', "-", "[tru", "[1e", "[1e+", '"\\u', '"\\u12', "[1.", "[-"]) {
      expect(locateJsonError(text), JSON.stringify(text)).toBe(text.length);
    }
  });
});

describe("normalizadores ante errores sin forma conocida", () => {
  it("JSON: un mensaje sin posición ni fragmento se localiza con el respaldo", () => {
    const text = "[1,2,]";
    const e = normalizeJsonError(new SyntaxError("algo que ningún motor dice"), text);
    expect(e.offset).toBe(5);
  });

  it("YAML: un error que es solo un texto, sin reason ni mark", () => {
    const e = normalizeYamlError("fallo a secas", "a: 1");
    expect(e).toMatchObject({ message: "Fallo a secas", offset: null, line: null, hint: null });
  });

  it("TOML: un error que es solo un texto", () => {
    const e = normalizeTomlError("fallo a secas", "a = 1");
    expect(e).toMatchObject({ message: "Fallo a secas", offset: null, line: null, hint: null });
  });

  it("YAML: un flujo sin documentos se describe como nulo", () => {
    const r = validateYaml("# x", { loadAll: () => [] });
    expect(r.meta).toMatchObject({ documents: 0, rootType: "null", keyCount: 0, depth: 0 });
  });

  it("XML: un <parsererror> sin texto no rompe", () => {
    const doc = { getElementsByTagNameNS: (ns) => (ns === "http://www.w3.org/1999/xhtml" ? [{}] : []) };
    expect(findParserError(doc)).toBe("");
  });
});

describe("json-schema · casos límite", () => {
  it("resolveKeywordValue: una ruta que no existe en el schema → undefined", () => {
    expect(resolveKeywordValue({ properties: {} }, "#/properties/falta/pattern")).toBeUndefined();
    expect(resolveKeywordValue({ properties: { x: { $ref: "#/nada/mas" } } }, "#/properties/x/$ref/pattern")).toBeUndefined();
  });

  it("explainUnit: un enum cuyo mensaje no se puede leer → sin pista", () => {
    const unit = (error) => ({ keyword: "enum", instanceLocation: "#", keywordLocation: "#/enum", error });
    expect(explainUnit(unit("Instance does not match any of nada."), {}, "validation").hint).toBeNull();
    expect(explainUnit(unit("Instance does not match any of [no es json]."), {}, "validation").hint).toBeNull();
  });

  it("explainUnit: un pattern que no se puede resolver usa la pista sin valor", () => {
    const unit = { keyword: "pattern", instanceLocation: "#/a", keywordLocation: "#/properties/a/$ref/pattern", error: "String does not match pattern." };
    const schema = { properties: { a: { $ref: "https://remoto.example/s.json" } } };
    expect(explainUnit(unit, schema, "validation")).toMatchObject({ hint: "kw_patternNoValue", params: {} });
  });

  it("un schema 'false' en la raíz: error sin ruta ni propiedad, sin pista", () => {
    const r = validateJsonSchema("5", "false", lib);
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ hint: null, path: "", offset: 0 });
  });

  it("checkSchemaAndDocument: una excepción que no es un Error se traduce igualmente", () => {
    const fake = { metaschemas: { "2020-12": [{}] }, Validator: class { validate() { throw "texto suelto"; } addSchema() {} } };
    expect(checkSchemaAndDocument(fake, {}, {}, "2020-12")).toEqual({ stage: "thrown", thrown: { name: "Error", message: "texto suelto" } });
  });

  it("prepareSchemaCheck: null y undefined cuentan como vacío", () => {
    expect(prepareSchemaCheck(null, undefined).early.meta.stage).toBe("empty");
  });

  it("el cliente: un fallo del Worker sin mensaje usa uno por defecto", async () => {
    class W {
      constructor() { this.l = { message: new Set(), error: new Set() }; }
      addEventListener(t, f) { this.l[t].add(f); }
      removeEventListener(t, f) { this.l[t].delete(f); }
      postMessage() { queueMicrotask(() => this.l.error.forEach((f) => f({}))); }
      terminate() {}
    }
    const check = createSchemaChecker({ workerUrl: "/w.js", WorkerImpl: W });
    const r = await check('{"a":1}', '{"type":"object"}');
    expect(r.errors[0].message).toBe("Worker error");
  });
});

describe("ejemplos de cada herramienta (los que carga «Probar ejemplo»)", () => {
  it("JSON: coma de más en la lista, línea 3", () => {
    const r = validateJson(JSON_SAMPLE);
    expect(r.errors[0]).toMatchObject({ line: 3, column: 34, hint: "trailingComma" });
  });

  it("YAML: sangría incorrecta, línea 5", () => {
    expect(vy(YAML_SAMPLE, jsyaml).errors[0]).toMatchObject({ line: 5, column: 2, hint: "badIndent" });
  });

  it("TOML: texto sin comillas, línea 6", () => {
    expect(validateToml(TOML_SAMPLE, smol).errors[0]).toMatchObject({ line: 6, column: 8, hint: "invalidValue" });
  });

  it("XML: etiqueta que se cierra con otro nombre (el ejemplo es texto XML con el cierre en la línea 4)", () => {
    expect(XML_SAMPLE.split("\n")[3]).toContain("</libros>");
    expect(XML_SAMPLE).toContain("<libro ");
  });

  it("modo schema: cuatro errores, uno por palabra clave distinta", () => {
    const r = validateJsonSchema(SCHEMA_SAMPLE.document, SCHEMA_SAMPLE.schema, lib);
    expect(r.meta).toEqual({ stage: "validation", draft: "2020-12" });
    expect(r.errors.map((e) => [e.path, e.hint])).toEqual([
      ["", "kw_required"], ["/edad", "kw_minimum"], ["/email", "kw_format"], ["/roles", "kw_uniqueItems"],
    ]);
  });

  it("el documento de ejemplo del modo schema es JSON válido por sí solo", () => {
    expect(validateJson(SCHEMA_SAMPLE.document).valid).toBe(true);
    expect(validateJson(SCHEMA_SAMPLE.schema).valid).toBe(true);
  });
});

describe("json · llave o corchete de cierre sin nada delante", () => {
  it("no es una coma final: no hay pista, y se localiza en el primer carácter", () => {
    for (const text of ["]", "  }", "\n]"]) {
      const r = validateJson(text);
      expect(r.valid, text).toBe(false);
      expect(r.errors[0].hint, text).toBeNull();
      expect(r.errors[0].offset, text).toBe(text.search(/[\]}]/));
    }
  });
});
