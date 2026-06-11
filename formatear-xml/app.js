// Formatear XML — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común (entrada → formatear/minificar → copiar) en ../lib/code-tool.js.
import { format, minify, SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { mountCodeTool } from "../lib/code-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-xml",
  format,
  minify,
  sample: SAMPLE,
});

renderGuide(document.getElementById("xml-guide"), GUIDE, msgs("formatear-xml").guide);
