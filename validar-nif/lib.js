// Validar NIF/CIF/NIE — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/nif.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": 5 identificadores, el 3º con la letra de control mal y el 5º corto. */
export const SAMPLE = ["12345678Z", "X1234567L", "12345678A", "A58818501", "1234567Z"].join("\n");
