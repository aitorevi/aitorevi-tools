// Chuleta del validador de YAML: errores típicos y construcciones que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["Tab", "tabIndent"],
      ["a: b: c", "twoColons"],
      ["a: 1 · a: 2", "duplicateKey"],
      ['"texto', "unclosedQuote"],
      ["[1, 2", "unclosedFlow"],
      ["*x", "unknownAlias"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["---", "multiDoc"],
      ["&x  *x", "anchors"],
      ["# …", "comment"],
      ["- a", "list"],
    ],
  },
];
