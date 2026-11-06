// Validar IBAN — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/iban.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": 4 IBAN, el 2º con las cifras de control mal y el 4º demasiado corto. */
export const SAMPLE = [
  "ES91 2100 0418 4502 0005 1332",
  "ES91 2100 0418 4502 0005 1333",
  "DE89 3704 0044 0532 0130 00",
  "FR76 3000 6000 0112",
].join("\n");
