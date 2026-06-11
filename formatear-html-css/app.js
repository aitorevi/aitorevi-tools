// Formatear HTML/CSS — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común en ../lib/code-tool.js. js-beautify llega como global del UMD
// vendorizado (window.beautifier) y se inyecta en format.
import { format, SAMPLE } from "./lib.js";
import { mountCodeTool } from "../lib/code-tool.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-html-css",
  format: (code) => format(code, window.beautifier),
  sample: SAMPLE,
});
