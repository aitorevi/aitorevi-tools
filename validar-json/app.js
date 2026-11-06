// Validar JSON — cableado del DOM. La validación vive en ../lib/validators/json.js,
// la UI común en ../lib/validate-tool.js y formatear/minificar en ../lib/json-format.js
// (reescriben solo el espacio en blanco: no alteran ningún valor).
import { SAMPLE, stripBom } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateJson } from "../lib/validators/json.js";
import { formatJson, minifyJson } from "../lib/json-format.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-json",
  validate: validateJson,
  metaItems: (meta, M) => [
    [M.valRootType, (M.types && M.types[meta.rootType]) || meta.rootType],
    [M.valKeys, String(meta.keyCount)],
    [M.valDepth, String(meta.depth)],
  ],
  format: (text) => formatJson(stripBom(text)),
  minify: (text) => minifyJson(stripBom(text)),
  sample: SAMPLE,
});

renderGuide(document.getElementById("validate-json-guide"), GUIDE, msgs("validar-json").guide);
