// Formatear XML — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común (entrada → formatear/minificar → copiar) en ../lib/code-tool.js.
import { format, minify, SAMPLE } from "./lib.js";
import { mountCodeTool } from "../lib/code-tool.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-xml",
  format,
  minify,
  sample: SAMPLE,
});
