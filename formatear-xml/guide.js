// Chuleta de XML: estructura de elementos y construcciones especiales.
export const GUIDE = [
  {
    name: "structure",
    rows: [
      ["<tag>", "openTag"],
      ["</tag>", "closeTag"],
      ["<tag/>", "selfClose"],
      ['attr="…"', "attr"],
    ],
  },
  {
    name: "special",
    rows: [
      ["<!-- -->", "comment"],
      ["<![CDATA[…]]>", "cdata"],
      ["<?xml?>", "declaration"],
      ["&amp;", "entity"],
    ],
  },
];
