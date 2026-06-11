// Chuleta de HTML y CSS: sintaxis básica de ambos (la herramienta autodetecta).
export const GUIDE = [
  {
    name: "html",
    rows: [
      ["<tag>", "openTag"],
      ["</tag>", "closeTag"],
      ["<tag/>", "selfClose"],
      ['attr="…"', "attr"],
      ["<!-- -->", "htmlComment"],
    ],
  },
  {
    name: "css",
    rows: [
      ["sel { }", "rule"],
      ["prop: value;", "declaration"],
      [".class", "classSel"],
      ["#id", "idSel"],
      ["/* */", "cssComment"],
    ],
  },
];
