// Notas de JWT: estructura (símbolos/nombres universales) + clave de descripción.
// Las descripciones traducidas viven en i18n (tools.jwt.msg.guide).
export const GUIDE = [
  {
    name: "parts",
    rows: [
      ["header", "header"],
      ["payload", "payload"],
      ["signature", "signature"],
    ],
  },
  {
    name: "registered",
    rows: [
      ["iss", "iss"],
      ["sub", "sub"],
      ["aud", "aud"],
      ["exp", "exp"],
      ["nbf", "nbf"],
      ["iat", "iat"],
      ["jti", "jti"],
    ],
  },
  {
    name: "header",
    rows: [
      ["alg", "alg"],
      ["typ", "typ"],
      ["kid", "kid"],
    ],
  },
  {
    name: "common",
    rows: [
      ["name", "name"],
      ["email", "email"],
      ["role", "role"],
      ["scope", "scope"],
    ],
  },
];
