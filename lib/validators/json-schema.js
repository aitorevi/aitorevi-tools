// Validar un documento JSON contra un JSON Schema — lógica pura (sin DOM).
// Usa @cfworker/json-schema (intérprete: no genera código, así que cabe en la CSP
// `script-src 'self'`). La librería entra inyectada: es la de vendor/json-schema.min.js
// (`{ Validator, metaschemas }`). El trabajo pesado (checkSchemaAndDocument) puede
// correr en un Worker con límite de tiempo, porque una regex catastrófica en un
// `pattern` congelaría la pestaña; todo lo demás es ligero y va en el hilo principal.
//
// Pasos: 1) ambos textos son JSON válido; 2) el schema es válido contra el metaschema
// de su draft; 3) el documento cumple el schema. Los errores llevan `source`
// ("document" | "schema"), `path` (JSON Pointer), posición en su texto y una pista.
import { fail, makeError, ok } from "./result.js";
import { validateJson } from "./json.js";
import { offsetToLineColumn, splitBom } from "./position.js";
import { buildPointerIndex, fragmentToPointer, locatePointer, pointerSegments } from "./json-pointer.js";
import { describeValue } from "./describe.js";

// --- draft ------------------------------------------------------------------

const DRAFTS = [
  [/^https?:\/\/json-schema\.org\/draft-04\/schema#?$/, "4"],
  [/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/, "7"],
  [/^https?:\/\/json-schema\.org\/draft\/2019-09\/schema#?$/, "2019-09"],
  [/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema#?$/, "2020-12"],
];
export const DEFAULT_DRAFT = "2020-12";

/** { draft } según `$schema` (2020-12 si no lo trae) o { unsupported: url }. */
export function detectDraft(schema) {
  const url = schema && typeof schema === "object" && !Array.isArray(schema) ? schema.$schema : undefined;
  if (typeof url !== "string") return { draft: DEFAULT_DRAFT };
  const hit = DRAFTS.find(([re]) => re.test(url));
  return hit ? { draft: hit[1] } : { unsupported: url };
}

// --- errores de la librería: filtrado y pistas -------------------------------

// Contenedores: su mensaje solo dice "alguna propiedad/elemento falló"; el error
// útil está en sus hijos.
const AGGREGATORS = new Set([
  "properties", "patternProperties", "items", "prefixItems", "additionalItems", "$ref", "$dynamicRef",
  "$recursiveRef", "allOf", "dependentSchemas", "dependencies", "if", "then", "else",
  "additionalProperties", "unevaluatedProperties", "unevaluatedItems",
]);
// Se conserva su mensaje y se descartan los de sus subesquemas (son las alternativas).
const ALTERNATIVES = new Set(["anyOf", "oneOf", "not", "propertyNames"]);

/** Deja solo los errores con información útil, en el orden de la librería. */
export function leafUnits(units) {
  const skip = [];
  const out = [];
  for (const u of units) {
    if (skip.some((prefix) => u.keywordLocation.startsWith(prefix))) continue;
    if (ALTERNATIVES.has(u.keyword)) { skip.push(`${u.keywordLocation}/`); out.push(u); continue; }
    if (AGGREGATORS.has(u.keyword)) continue;
    out.push(u);
  }
  return out;
}

/** Valor de `keywordLocation` dentro del schema, siguiendo los $ref locales. undefined si no se puede. */
export function resolveKeywordValue(schema, keywordLocation) {
  const segs = pointerSegments(fragmentToPointer(keywordLocation));
  let node = schema;
  for (const seg of segs) {
    if (node && typeof node === "object" && seg === "$ref" && typeof node.$ref === "string") {
      if (!node.$ref.startsWith("#")) return undefined;
      node = pointerSegments(fragmentToPointer(node.$ref)).reduce((n, s) => (n == null ? n : n[s]), schema);
    } else {
      node = node == null ? undefined : node[seg];
    }
  }
  return node;
}

const last = (arr) => arr[arr.length - 1];

// Cómo sacar los valores de la pista del mensaje de la librería (versión fija).
// Si faltan, la pista se descarta y se muestra el mensaje técnico.
const PARAMS = {
  type: (m) => { const x = m.match(/Instance type "(.+?)" is invalid\. Expected (.+)\.$/); return x && { actual: x[1], expected: x[2].replace(/"/g, "") }; },
  required: (m) => { const x = m.match(/required property "(.+?)"/); return x && { property: x[1] }; },
  enum: (m) => {
    const x = m.match(/any of (\[.*\])\.$/);
    if (!x) return null;
    try { return { list: JSON.parse(x[1]).map((v) => JSON.stringify(v)).join(", ") }; } catch { return null; }
  },
  const: (m) => { const x = m.match(/match (.+)\.$/); return x && { value: x[1] }; },
  format: (m) => { const x = m.match(/format "(.+?)"/); return x && { format: x[1] }; },
  minimum: (m) => { const x = m.match(/^(.+) is less than (.+)\.$/); return x && { value: x[1], limit: x[2] }; },
  maximum: (m) => { const x = m.match(/^(.+) is greater than (.+)\.$/); return x && { value: x[1], limit: x[2] }; },
  exclusiveMinimum: (m) => { const x = m.match(/^(.+) is less than (.+)\.$/); return x && { value: x[1], limit: x[2] }; },
  exclusiveMaximum: (m) => { const x = m.match(/^(.+) is greater than or equal to (.+)\.$/); return x && { value: x[1], limit: x[2] }; },
  multipleOf: (m) => { const x = m.match(/^(.+) is not a multiple of (.+)\.$/); return x && { value: x[1], limit: x[2] }; },
  minLength: (m) => { const x = m.match(/\((\d+) < (\d+)\)/); return x && { length: x[1], limit: x[2] }; },
  maxLength: (m) => { const x = m.match(/\((\d+) > (\d+)\)/); return x && { length: x[1], limit: x[2] }; },
  minItems: (m) => { const x = m.match(/\((\d+) < (\d+)\)/); return x && { length: x[1], limit: x[2] }; },
  maxItems: (m) => { const x = m.match(/\((\d+) > (\d+)\)/); return x && { length: x[1], limit: x[2] }; },
  uniqueItems: (m) => { const x = m.match(/indexes (\d+) and (\d+)/); return x && { a: x[1], b: x[2] }; },
  // Su mensaje de maxProperties dice "at least" por error: se usa solo el número.
  minProperties: (m) => { const x = m.match(/at least (\d+)/); return x && { limit: x[1] }; },
  maxProperties: (m) => { const x = m.match(/at least (\d+)/); return x && { limit: x[1] }; },
  propertyNames: (m) => { const x = m.match(/Property name "(.+?)"/); return x && { property: x[1] }; },
  dependentRequired: (m) => { const x = m.match(/has "(.+?)" but does not have "(.+?)"/); return x && { property: x[1], needs: x[2] }; },
  oneOf: (m) => { const x = m.match(/\((\d+) matches\)/); return x && { matches: x[1] }; },
  anyOf: () => ({}),
  not: () => ({}),
  contains: () => ({}),
};

/** Mensaje técnico corregido para los textos erróneos de la librería. */
function technicalMessage(unit, params) {
  if (unit.keyword === "maxProperties" && params) return `Instance has more than ${params.limit} properties.`;
  if (unit.keyword === "exclusiveMinimum" && params) return `${params.value} is not greater than ${params.limit}.`;
  return unit.error;
}

/** Clave de pista (prefijo kw_) y parámetros de un error de la librería. */
export function explainUnit(unit, schemaRoot, stage) {
  const pointer = fragmentToPointer(unit.instanceLocation);
  if (stage === "schema" && unit.keyword === "anyOf" && last(pointerSegments(pointer)) === "type") {
    return { hint: "schema_type", params: {}, message: unit.error };
  }
  // Una regex inválida en `pattern` la detecta el metaschema (format: regex), con su posición.
  if (stage === "schema" && unit.keyword === "format" && /format "regex"/.test(unit.error)) {
    return { hint: "schema_regex", params: {}, message: unit.error };
  }
  if (unit.keyword === "false") {
    const property = last(pointerSegments(pointer));
    return { hint: property === undefined ? null : "kw_notAllowed", params: { property }, message: unit.error };
  }
  const extract = PARAMS[unit.keyword];
  if (unit.keyword === "pattern") {
    const pattern = resolveKeywordValue(schemaRoot, unit.keywordLocation);
    return typeof pattern === "string"
      ? { hint: "kw_pattern", params: { pattern }, message: unit.error }
      : { hint: "kw_patternNoValue", params: {}, message: unit.error };
  }
  const params = extract ? extract(unit.error) : null;
  if (!params) return { hint: null, params: undefined, message: unit.error };
  return { hint: `kw_${unit.keyword}`, params, message: technicalMessage(unit, params) };
}

// --- trabajo pesado (puede ir en un Worker) ----------------------------------

/**
 * 1) valida el schema contra el metaschema de su draft; 2) valida el documento.
 * Devuelve datos serializables: { stage: "schema" | "validation" | "valid", units }
 * o { stage: "thrown", thrown: { name, message } } si la librería lanza (referencia
 * sin resolver, regex inválida, referencia circular…).
 * @param {{ Validator: Function, metaschemas: Object }} lib
 */
export function checkSchemaAndDocument(lib, schema, doc, draft) {
  try {
    const [main, ...rest] = lib.metaschemas[draft];
    const meta = new lib.Validator(main, draft, false);
    for (const extra of rest) meta.addSchema(extra);
    const metaResult = meta.validate(schema);
    if (!metaResult.valid) return { stage: "schema", units: metaResult.errors };

    const result = new lib.Validator(schema, draft, false).validate(doc);
    return result.valid ? { stage: "valid", units: [] } : { stage: "validation", units: result.errors };
  } catch (e) {
    return { stage: "thrown", thrown: { name: (e && e.name) || "Error", message: String((e && e.message) || e).split("\n")[0] } };
  }
}

// --- orquestación (ligera, hilo principal) -----------------------------------

const withSource = (errors, source, emptyHint) =>
  errors.map((e) => ({ ...e, source, ...(e.hint === "empty" ? { hint: emptyHint } : {}) }));

/**
 * Valida la sintaxis de ambos textos y prepara el trabajo pesado.
 * @returns {{ early: Object } | { run: { schema, doc, draft }, ctx: Object }}
 *   `early` es un resultado final (error de sintaxis, texto vacío, draft no soportado).
 */
export function prepareSchemaCheck(documentText, schemaText) {
  const docText = String(documentText == null ? "" : documentText);
  const schText = String(schemaText == null ? "" : schemaText);
  const docRes = validateJson(docText);
  const schRes = validateJson(schText);
  const docEmpty = docRes.errors[0] && docRes.errors[0].hint === "empty";
  const schEmpty = schRes.errors[0] && schRes.errors[0].hint === "empty";

  if (docEmpty && schEmpty) return { early: fail([], { stage: "empty" }) };
  if (!docRes.valid || !schRes.valid) {
    const errors = [
      ...(schRes.valid ? [] : withSource(schRes.errors, "schema", "emptySchema")),
      ...(docRes.valid ? [] : withSource(docRes.errors, "document", "emptyDocument")),
    ];
    return { early: fail(errors, { stage: docEmpty || schEmpty ? "missing" : "syntax" }) };
  }

  const schema = JSON.parse(splitBom(schText).body);
  const doc = JSON.parse(splitBom(docText).body);
  const detected = detectDraft(schema);
  if (detected.unsupported) {
    const error = makeError(`Unsupported $schema: ${detected.unsupported}`, {
      hint: "unsupportedDraft", source: "schema", params: { schema: detected.unsupported }, path: "/$schema",
    });
    return { early: fail([error], { stage: "schema" }) };
  }
  return {
    run: { schema, doc, draft: detected.draft },
    ctx: { docText, schText, schema, doc, draft: detected.draft, docMeta: docRes.meta, schMeta: schRes.meta },
  };
}

/** Un error de la librería → error de la forma común, con su posición en el texto. */
function toError(unit, { text, index, hadBom, source, schemaRoot, stage }) {
  const { hint, params, message } = explainUnit(unit, schemaRoot, stage);
  let pointer = fragmentToPointer(unit.instanceLocation);
  let target = "value";
  if (hint === "kw_notAllowed") target = "key";
  if (unit.keyword === "propertyNames" && params && params.property !== undefined) {
    pointer = `${pointer}/${params.property.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    target = "key";
  }
  const at = locatePointer(index, pointer, target);
  const offset = at == null ? null : at + (hadBom ? 1 : 0);
  const pos = offset == null ? null : offsetToLineColumn(text, offset);
  return makeError(message, {
    offset: pos ? offset : null, line: pos ? pos.line : null, column: pos ? pos.column : null,
    hint, params, path: pointer, source,
  });
}

/** Traduce una excepción de la librería a un error del schema, con pista si se reconoce. */
function thrownError({ name, message }) {
  let m;
  if ((m = message.match(/Unresolved \$ref "(.+?)"/))) {
    return makeError(message.replace(/\.\s+Absolute URI.*$/, "."), { hint: "unresolvedRef", params: { ref: m[1] }, source: "schema" });
  }
  if (name === "SyntaxError" && (m = message.match(/Invalid regular expression: (.+)$/))) {
    return makeError(message, { hint: "badPattern", params: { reason: m[1] }, source: "schema" });
  }
  if (name === "RangeError") return makeError(message, { hint: "circularRef", source: "schema" });
  return makeError(message, { source: "schema" });
}

/** Resultado final a partir del trabajo pesado (`raw`, ver checkSchemaAndDocument). */
export function finishSchemaCheck(ctx, raw) {
  const { docText, schText, schema, draft } = ctx;
  if (raw.stage === "thrown") return fail([thrownError(raw.thrown)], { stage: "schema", draft });
  if (raw.stage === "valid") {
    const { rootType, keyCount, depth } = describeValue(ctx.doc);
    return ok({ stage: "valid", draft, rootType, keyCount, depth });
  }
  const isSchema = raw.stage === "schema";
  const text = isSchema ? schText : docText;
  const hadBom = isSchema ? ctx.schMeta.hadBom : ctx.docMeta.hadBom;
  const source = isSchema ? "schema" : "document";
  const index = buildPointerIndex(splitBom(text).body); // una sola vez, no por error
  const errors = leafUnits(raw.units).map((u) => toError(u, { text, index, hadBom, source, schemaRoot: schema, stage: raw.stage }));
  return fail(errors, { stage: isSchema ? "schema" : "validation", draft });
}

/** Todo el flujo en un solo hilo (tests y entornos sin Worker). */
export function validateJsonSchema(documentText, schemaText, lib) {
  const prepared = prepareSchemaCheck(documentText, schemaText);
  if (prepared.early) return prepared.early;
  const { schema, doc, draft } = prepared.run;
  return finishSchemaCheck(prepared.ctx, checkSchemaAndDocument(lib, schema, doc, draft));
}
