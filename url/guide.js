// Chuleta de URL encode: caracteres codificados frecuentes + casos de uso.
export const GUIDE = [
  {
    name: "chars",
    rows: [
      ["espacio", "spaceEnc"],
      ["&", "ampEnc"],
      ["=", "eqEnc"],
      ["?", "qmEnc"],
      ["/", "slashEnc"],
      ["#", "hashEnc"],
      ["á / é / í / ó / ú", "accentEnc"],
      ["ñ", "enjeEnc"],
    ],
  },
  {
    name: "use",
    rows: [
      ["?q=café & más", "useQuery"],
      ["?redirect=https://...", "useRedirect"],
      ["nombre=Ana García", "useForm"],
      ["%E2%82%AC factura", "useDebug"],
    ],
  },
];
