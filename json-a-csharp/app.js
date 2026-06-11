// JSON → C# / TypeScript — cableado del DOM. La lógica pura vive en ./lib.js y
// la UI común en ../lib/code-tool.js. quicktype-core llega como global del
// bundle vendorizado (window.quicktypeCore) y se inyecta en format (async).
import { format, TARGETS, SAMPLE } from "./lib.js";
import { mountCodeTool } from "../lib/code-tool.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "json-a-csharp",
  format: (json, target) => format(json, window.quicktypeCore, target),
  sample: SAMPLE,
  select: { labelKey: "codeTarget", choices: TARGETS, value: "csharp" },
});
