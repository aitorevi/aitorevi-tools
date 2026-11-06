// Validar TOML — cableado del DOM. La validación vive en ../lib/validators/toml.js
// (smol-toml llega como global del UMD vendorizado, window.SmolTOML) y la UI común
// en ../lib/validate-tool.js. Sin formatear/minificar: reescribir TOML pasaría por
// parse + stringify y alteraría comentarios y estilo.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateToml } from "../lib/validators/toml.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-toml",
  validate: (text) => validateToml(text, window.SmolTOML),
  metaItems: (meta, M) => [
    [M.valKeys, String(meta.keyCount)],
    [M.valTables, String(meta.tableCount)],
    [M.valDepth, String(meta.depth)],
  ],
  sample: SAMPLE,
});

renderGuide(document.getElementById("validator-guide"), GUIDE, msgs("validar-toml").guide);
