// Chuleta de HTML y CSS: sintaxis y elementos de ambos (la herramienta autodetecta).
export const GUIDE = [
  {
    name: "htmlSyntax",
    rows: [
      ["<tag>", "openTag"],
      ["</tag>", "closeTag"],
      ["<tag/>", "selfClose"],
      ['attr="…"', "attr"],
      ["<!-- -->", "htmlComment"],
      ["<!DOCTYPE html>", "doctype"],
    ],
  },
  {
    name: "htmlElements",
    rows: [
      ["<div>", "div"],
      ["<span>", "span"],
      ["<a href>", "anchor"],
      ["<img src>", "img"],
      ["<ul><li>", "list"],
      ["<h1>…<h6>", "headings"],
    ],
  },
  {
    name: "cssSyntax",
    rows: [
      ["sel { }", "rule"],
      ["prop: value;", "declaration"],
      ["/* */", "cssComment"],
    ],
  },
  {
    name: "cssSelectors",
    rows: [
      [".class", "classSel"],
      ["#id", "idSel"],
      ["tag", "typeSel"],
      ["a, b", "groupSel"],
      ["a b", "descendantSel"],
      [":hover", "pseudoSel"],
    ],
  },
  {
    name: "cssValues",
    rows: [
      ["px", "px"],
      ["rem", "rem"],
      ["%", "percent"],
      ["#hex", "hex"],
      ["rgb()", "rgb"],
      ["flex / grid", "layout"],
    ],
  },
];
