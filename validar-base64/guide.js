// Chuleta del validador de Base64: errores típicos y variantes que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["SGVs bG8!", "badChar"],
      ["a+b-", "mixedAlphabet"],
      ["QQ==QQ", "paddingMiddle"],
      ["QQ=", "badPadding"],
      ["QUJDQ", "badLength"],
      ["data:…;base64,", "dataUri"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["QUJD", "plain"],
      ["QQ==", "padded"],
      ["a-b_", "urlsafe"],
      ["SGVs⏎bG8=", "lineBreaks"],
    ],
  },
];
