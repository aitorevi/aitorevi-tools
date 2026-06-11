// Chuleta de regex: estructura (símbolos universales) + clave de descripción.
// Las descripciones traducidas viven en i18n (tools.regex.msg.guide). app.js
// monta el HTML combinando ambos.
export const GUIDE = [
  {
    name: "anchors",
    rows: [
      ["^", "start"],
      ["$", "end"],
      ["\\b", "wordBoundary"],
      ["\\B", "nonBoundary"],
    ],
  },
  {
    name: "classes",
    rows: [
      [".", "any"],
      ["\\d", "digit"],
      ["\\D", "nonDigit"],
      ["\\w", "word"],
      ["\\s", "space"],
      ["[abc]", "set"],
      ["[^abc]", "negSet"],
      ["[a-z]", "range"],
    ],
  },
  {
    name: "quantifiers",
    rows: [
      ["*", "zeroMore"],
      ["+", "oneMore"],
      ["?", "optional"],
      ["{n}", "exactly"],
      ["{n,m}", "between"],
      ["*?", "lazy"],
    ],
  },
  {
    name: "groups",
    rows: [
      ["(...)", "capture"],
      ["(?:...)", "nonCapture"],
      ["(?<n>...)", "named"],
      ["a|b", "alternation"],
      ["\\1", "backref"],
    ],
  },
  {
    name: "flags",
    rows: [
      ["g", "flagG"],
      ["i", "flagI"],
      ["m", "flagM"],
      ["s", "flagS"],
    ],
  },
];
