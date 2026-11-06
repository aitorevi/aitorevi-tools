// Chuleta del validador de XML: errores típicos y construcciones que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["<a></b>", "mismatchedTag"],
      ["<a>", "unclosedTag"],
      ["<a/><b/>", "extraContent"],
      ["&", "unescapedAmpersand"],
      ["b=1", "attributeQuotes"],
      ["&nbsp;", "undefinedEntity"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["<a/>", "selfClose"],
      ["<!-- -->", "comment"],
      ["<![CDATA[ ]]>", "cdata"],
      ["<?xml ?>", "declaration"],
    ],
  },
];
