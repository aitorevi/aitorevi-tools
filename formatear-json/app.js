// Formatear JSON — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común (entrada → formatear/minificar → copiar) en ../lib/code-tool.js.
import { format, minify, SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { mountCodeTool } from "../lib/code-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-json",
  format,
  minify,
  sample: SAMPLE,
});

renderGuide(document.getElementById("json-guide"), GUIDE, msgs("formatear-json").guide);
