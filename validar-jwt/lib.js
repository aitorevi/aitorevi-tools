// Validar JWT — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/jwt.js y la UI en lib/validate-tool.js.

/**
 * Ejemplo para "Probar ejemplo": un JWT sin la firma (solo dos partes), así que
 * muestra el error de estructura. Es el de la herramienta JWT, quitándole la firma.
 */
export const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFpdG9yIFJldmlyaWVnbyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjoxNzE2MjQyNjIyfQ";
