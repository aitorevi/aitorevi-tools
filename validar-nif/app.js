// Validar NIF/CIF/NIE — cableado del DOM. La validación vive en ../lib/validators/nif.js
// y la UI común (modo lista) en ../lib/validate-tool.js. Sin formatear/minificar.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateNifs } from "../lib/validators/nif.js";
import { listMetaItems, mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-nif",
  validate: validateNifs,
  list: true,
  metaItems: (meta, M) => listMetaItems(meta, M, (kind) => M.kinds[kind] || kind),
  sample: SAMPLE,
});

renderGuide(document.getElementById("validator-guide"), GUIDE, msgs("validar-nif").guide);
