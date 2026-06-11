// Generador de hash — cableado del DOM. Lógica pura en ./lib.js y UI común en
// ../lib/transform-tool.js. El algoritmo se elige en el selector; hashHex es async.
import { hashHex, ALGORITHMS, SAMPLE } from "./lib.js";
import { mountTransformTool } from "../lib/transform-tool.js";

mountTransformTool({
  mount: "#transform-tool",
  toolId: "hash",
  select: {
    labelKey: "hashAlgorithm",
    value: "SHA-256",
    choices: ALGORITHMS.map((a) => ({ value: a, label: a })),
  },
  transform: (text, algo) => hashHex(text, algo),
  sample: SAMPLE,
});
