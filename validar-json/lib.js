// Validar JSON — datos puros de la herramienta (sin DOM), testeables con Vitest.
// La validación vive en lib/validators/json.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": una coma de más en la lista (línea 3). */
export const SAMPLE =
  '{\n  "nombre": "aitorevi.tools",\n  "herramientas": ["json", "xml",],\n  "privado": true\n}';

/** Quita un BOM inicial: JSON.parse lo rechaza aunque el validador lo acepte. */
export const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/** Ejemplo del modo schema: un documento con cuatro errores frente a su schema. */
export const SCHEMA_SAMPLE = {
  document:
    '{\n  "nombre": "Ana",\n  "edad": -3,\n  "email": "ana-at-correo",\n  "roles": ["admin", "admin"]\n}',
  schema:
    '{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "type": "object",\n  "required": ["nombre", "edad", "email", "activo"],\n  "properties": {\n    "nombre": { "type": "string", "minLength": 2 },\n    "edad": { "type": "integer", "minimum": 0 },\n    "email": { "type": "string", "format": "email" },\n    "roles": { "type": "array", "uniqueItems": true }\n  },\n  "additionalProperties": false\n}',
};
