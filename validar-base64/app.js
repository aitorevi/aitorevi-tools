// Validar Base64 — cableado del DOM. La validación vive en ../lib/validators/base64.js
// y la UI común en ../lib/validate-tool.js. Sin formatear/minificar: Base64 no tiene
// "forma bonita" y reescribirlo cambiaría el dato.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateBase64 } from "../lib/validators/base64.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-base64",
  validate: validateBase64,
  metaItems: (meta, M) => [
    [M.valVariant, M.variants[meta.variant]],
    [M.valPadding, meta.padded ? M.yes : M.no],
    [M.valBytes, String(meta.bytes)],
    [M.valUtf8, meta.utf8 ? M.yes : M.no],
  ],
  sample: SAMPLE,
});

renderGuide(document.getElementById("validator-guide"), GUIDE, msgs("validar-base64").guide);
