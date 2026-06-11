// Formatear JS/TS — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común en ../lib/code-tool.js. Prettier llega como global del bundle
// vendorizado (window.prettierTool) y se inyecta en format (async).
import { format, PARSERS, SAMPLE } from "./lib.js";
import { mountCodeTool } from "../lib/code-tool.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-js",
  format: (code, parser) => format(code, window.prettierTool, parser),
  sample: SAMPLE,
  select: { labelKey: "codeTarget", choices: PARSERS, value: "babel" },
});
