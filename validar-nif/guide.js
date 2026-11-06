// Chuleta del validador de NIF/CIF/NIE: errores típicos y formas que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["12.345.678-Z", "separator"],
      ["12345678A", "badControl"],
      ["1234567Z", "tooShort"],
      ["I2345678Z", "badStart"],
      ["12A45678Z", "badShape"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["12345678Z", "dni"],
      ["X1234567L", "nie"],
      ["A58818501", "cif"],
      ["12345678z", "lowercase"],
    ],
  },
];
