// Chuleta del validador de TOML: errores típicos y construcciones que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["a = hola", "invalidValue"],
      ["a = 1 b = 2", "oneEntryPerLine"],
      ["a = 1 · a = 2", "duplicateKey"],
      ['"texto', "unclosedString"],
      ["[tabla", "incompleteKey"],
      ["a = 01", "leadingZero"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["[tabla]", "table"],
      ["[[lista]]", "arrayTables"],
      ["{ x = 1 }", "inline"],
      ["1979-05-27", "date"],
    ],
  },
];
