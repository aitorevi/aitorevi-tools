// Validar YAML — cableado del DOM. La validación vive en ../lib/validators/yaml.js
// (js-yaml llega como global del UMD vendorizado, window.jsyaml) y la UI común en
// ../lib/validate-tool.js. Sin formatear/minificar: el formateador de YAML
// reescribe el documento (normaliza el estilo) y no es una operación neutra.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateYaml } from "../lib/validators/yaml.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-yaml",
  validate: (text) => validateYaml(text, window.jsyaml),
  metaItems: (meta, M) => [
    [M.valDocuments, String(meta.documents)],
    // Con varios documentos el tipo raíz sería el del primero: no se muestra.
    ...(meta.documents <= 1 ? [[M.valRootType, (M.types && M.types[meta.rootType]) || meta.rootType]] : []),
    [M.valKeys, String(meta.keyCount)],
    [M.valDepth, String(meta.depth)],
  ],
  sample: SAMPLE,
});

renderGuide(document.getElementById("validate-yaml-guide"), GUIDE, msgs("validar-yaml").guide);
