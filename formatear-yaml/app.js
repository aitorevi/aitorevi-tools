// Formatear YAML — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común en ../lib/code-tool.js. js-yaml llega como global del UMD vendorizado
// (window.jsyaml) y se inyecta en format.
import { format, SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { mountCodeTool } from "../lib/code-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-yaml",
  format: (yaml) => format(yaml, window.jsyaml),
  sample: SAMPLE,
});

renderGuide(document.getElementById("yaml-guide"), GUIDE, msgs("formatear-yaml").guide);
