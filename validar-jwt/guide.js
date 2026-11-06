// Chuleta del validador de JWT: errores típicos y lo que sí se acepta.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["Bearer eyJ…", "bearerPrefix"],
      ["aaa.bbb", "partsCount"],
      ["aaa.bbb.ccc.ddd.eee", "encrypted"],
      ["ab+d / abc=", "notUrlSafe"],
      ["{ }", "noAlg"],
      ['"exp": "17…"', "claimType"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["header.payload.firma", "structure"],
      ['"exp"', "expired"],
      ['"alg": "none"', "algNone"],
      ["alg", "noVerify"],
    ],
  },
];
