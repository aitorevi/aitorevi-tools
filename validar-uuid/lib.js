// Validar UUID — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/uuid.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": 4 UUID, el 2º demasiado corto y el 3º con una variante inválida. */
export const SAMPLE = [
  "550e8400-e29b-41d4-a716-446655440000",
  "123e4567-e89b-12d3-a456-42661417400",
  "f47ac10b-58cc-4372-c567-0e02b2c3d479",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
].join("\n");
