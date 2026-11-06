// Chuleta del validador de UUID: errores típicos y formas que también son válidas.
export const GUIDE = [
  {
    name: "errors",
    rows: [
      ["550e8400e29b41d4a716446655440000", "noHyphens"],
      ["{550e8400-e29b-…}", "wrapped"],
      ["550e8400-e29b-41d4-a716-4466554400", "tooShort"],
      ["550e840g-e29b-41d4-…", "badChar"],
      ["550e8400-e29b-91d4-…", "badVersion"],
      ["550e8400-e29b-41d4-c716-…", "badVariant"],
    ],
  },
  {
    name: "valid",
    rows: [
      ["xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", "v4"],
      ["550E8400-E29B-41D4-A716-446655440000", "uppercase"],
      ["00000000-0000-0000-0000-000000000000", "nil"],
      ["ffffffff-ffff-ffff-ffff-ffffffffffff", "max"],
    ],
  },
];
