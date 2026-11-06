// Validar XML — cableado del DOM. La validación vive en ../lib/validators/xml.js
// (usa window.DOMParser) y la UI común en ../lib/validate-tool.js.
// Sin formatear/minificar: en XML el espacio en blanco puede ser significativo y
// el formateador existente reparte el contenido mixto en líneas, así que
// alteraría datos.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateXml } from "../lib/validators/xml.js";
import { mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-xml",
  validate: (text) => validateXml(text, window.DOMParser),
  metaItems: (meta, M) => [
    [M.valRootElement, `<${meta.rootName}>`],
    [M.valElements, String(meta.elementCount)],
    [M.valAttributes, String(meta.attributeCount)],
    [M.valDepth, String(meta.depth)],
  ],
  sample: SAMPLE,
});

renderGuide(document.getElementById("validate-xml-guide"), GUIDE, msgs("validar-xml").guide);
