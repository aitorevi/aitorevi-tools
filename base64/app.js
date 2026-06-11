// Base64 — cableado del DOM. La lógica pura vive en ./lib.js y la UI común
// (entrada → salida en vivo + selector de modo) en ../lib/transform-tool.js.
import { encodeBase64, decodeBase64, SAMPLE } from "./lib.js";
import { mountTransformTool } from "../lib/transform-tool.js";

mountTransformTool({
  mount: "#transform-tool",
  toolId: "base64",
  select: {
    labelKey: "transformMode",
    value: "encode",
    choices: [
      { value: "encode", labelKey: "transformEncode" },
      { value: "decode", labelKey: "transformDecode" },
    ],
  },
  transform: (text, mode) => (mode === "decode" ? decodeBase64(text) : encodeBase64(text)),
  sample: SAMPLE,
});
