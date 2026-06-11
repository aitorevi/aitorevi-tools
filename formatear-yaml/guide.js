// Chuleta de YAML: estructura básica y trampas habituales.
export const GUIDE = [
  {
    name: "structure",
    rows: [
      [":", "pair"],
      ["-", "listItem"],
      ["#", "comment"],
      ["|", "literal"],
      [">", "folded"],
    ],
  },
  {
    name: "gotchas",
    rows: [
      ["tab", "noTabs"],
      ["yes", "boolTrap"],
      ['"…"', "quote"],
      ["---", "docSep"],
    ],
  },
];
