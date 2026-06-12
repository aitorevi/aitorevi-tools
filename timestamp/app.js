// Conversor de timestamps — cableado del DOM. Lógica pura en ./lib.js.
import { epochToHuman, humanToEpoch, MODES, SAMPLE_EPOCH } from "./lib.js";
import { mountTransformTool } from "../lib/transform-tool.js";
import { msgs } from "../lib/i18n.js";

const M = msgs("timestamp");

mountTransformTool({
  mount: "#transform-tool",
  toolId: "timestamp",
  select: {
    labelKey: "mode",
    value: MODES[0],
    choices: MODES.map((m) => ({ value: m, labelKey: m })),
  },
  transform: (text, mode) => mode === "humanToEpoch" ? humanToEpoch(text) : epochToHuman(text),
  sample: SAMPLE_EPOCH,
});
