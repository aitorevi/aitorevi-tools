// Codificar/decodificar URL — cableado del DOM. Lógica pura en ./lib.js y UI
// común en ../lib/transform-tool.js.
import { encodeUrl, decodeUrl, SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { mountTransformTool } from "../lib/transform-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountTransformTool({
  mount: "#transform-tool",
  toolId: "url",
  select: {
    labelKey: "transformMode",
    value: "encode",
    choices: [
      { value: "encode", labelKey: "transformEncode" },
      { value: "decode", labelKey: "transformDecode" },
    ],
  },
  transform: (text, mode) => (mode === "decode" ? decodeUrl(text) : encodeUrl(text)),
  sample: SAMPLE,
});

renderGuide(document.getElementById("url-guide"), GUIDE, msgs("url").guide);
