// Validar JSON — datos puros de la herramienta (sin DOM), testeables con Vitest.
// La validación vive en lib/validators/json.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": una coma de más en la lista (línea 3). */
export const SAMPLE =
  '{\n  "nombre": "aitorevi.tools",\n  "herramientas": ["json", "xml",],\n  "privado": true\n}';

/** Quita un BOM inicial: JSON.parse lo rechaza aunque el validador lo acepte. */
export const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
