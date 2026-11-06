// Chuleta del validador de IBAN: errores típicos y formas que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["ES91 2100 0418 4502 0005 1333", "badChecksum"],
      ["ES91 2100 0418", "badLength"],
      ["XX91 2100 0418 4502 0005 1332", "unknownCountry"],
      ["E591 2100 0418 4502 0005 1332", "badCountry"],
      ["ES9A 2100 0418 4502 0005 1332", "badCheckDigits"],
      ["ES91-2100-0418-4502-0005-1332", "badChar"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["ES91 2100 0418 4502 0005 1332", "grouped"],
      ["ES9121000418450200051332", "compact"],
      ["es91 2100 0418 4502 0005 1332", "lowercase"],
    ],
  },
];
