// Conversor de timestamps — cableado del DOM. Lógica pura en ./lib.js.
// Auto-detecta el tipo de entrada: número → epoch→fecha, texto → fecha→epoch.
import { epochToHuman, humanToEpoch, SAMPLE_EPOCH } from "./lib.js";
import { mountTransformTool } from "../lib/transform-tool.js";

mountTransformTool({
  mount: "#transform-tool",
  toolId: "timestamp",
  transform: (text) => /^-?\d+$/.test(text.trim()) ? epochToHuman(text) : humanToEpoch(text),
  sample: SAMPLE_EPOCH,
});
