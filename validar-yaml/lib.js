// Validar YAML — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/yaml.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": un elemento de la lista mal sangrado (línea 5). */
export const SAMPLE =
  "nombre: aitorevi.tools\nherramientas:\n  - json\n  - xml\n - yaml\nprivado: true";
