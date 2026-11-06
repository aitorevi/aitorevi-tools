// Validar JWT — cableado del DOM. La validación vive en ../lib/validators/jwt.js y la
// UI común en ../lib/validate-tool.js. Solo comprueba la estructura: no verifica la
// firma, no decodifica para mostrar (eso es la herramienta JWT) y no formatea.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateJwt } from "../lib/validators/jwt.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { fmt, msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-jwt",
  validate: (text) => validateJwt(text),
  metaItems: (meta, M) => [
    [M.valAlg, meta.alg],
    ...(meta.typ ? [[M.valTyp, meta.typ]] : []),
    ...(meta.iat ? [[M.valIat, meta.iat]] : []),
    ...(meta.nbf ? [[M.valNbf, meta.nbf]] : []),
    ...(meta.exp ? [[M.valExp, meta.exp]] : []),
  ],
  noteItems: (meta, M) => [M.valNoSignature, ...meta.notes.map((n) => fmt(M.notes[n.key], n.params))],
  sample: SAMPLE,
});

renderGuide(document.getElementById("validator-guide"), GUIDE, msgs("validar-jwt").guide);
