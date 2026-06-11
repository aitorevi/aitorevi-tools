// Chuleta de JSON: tipos de dato y reglas/errores típicos.
export const GUIDE = [
  {
    name: "types",
    rows: [
      ['"…"', "strType"],
      ["42", "numType"],
      ["true", "boolType"],
      ["null", "nullType"],
      ["[…]", "arrType"],
      ["{…}", "objType"],
    ],
  },
  {
    name: "rules",
    rows: [
      ['"clave":', "keysRule"],
      [",", "trailingComma"],
      ["'…'", "singleQuote"],
      ["//", "noComments"],
    ],
  },
];
