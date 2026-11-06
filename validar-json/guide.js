// Chuleta del validador: errores típicos al escribir JSON a mano y qué también es válido.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ['{"a":1,}', "trailingComma"],
      ["'a'", "singleQuotes"],
      ["{a: 1}", "unquotedKey"],
      ["//  /* */", "comments"],
      ["[1 2]", "missingComma"],
      ["NaN", "nonJsonValue"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["42", "number"],
      ['"hola"', "string"],
      ["null", "null"],
      ["[]  {}", "empty"],
      ["BOM", "bom"],
    ],
  },
];
