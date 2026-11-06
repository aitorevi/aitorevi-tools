// Validar IBAN — cableado del DOM. La validación vive en ../lib/validators/iban.js y la
// UI común (modo lista) en ../lib/validate-tool.js. Sin formatear/minificar.
import { SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { validateIbans } from "../lib/validators/iban.js";
import { listMetaItems, mountValidateTool } from "../lib/validate-tool.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs } from "../lib/i18n.js";

/** Nombre del país en el idioma de la página (Intl, sin red); si no lo conoce, el código. */
const countryName = (code) => {
  try {
    return `${new Intl.DisplayNames([document.documentElement.lang || "es"], { type: "region" }).of(code)} (${code})`;
  } catch {
    return code;
  }
};

mountValidateTool({
  mount: "#code-tool",
  toolId: "validar-iban",
  validate: validateIbans,
  list: true,
  metaItems: (meta, M) => listMetaItems(meta, M, countryName, M.valCountry),
  sample: SAMPLE,
});

renderGuide(document.getElementById("validator-guide"), GUIDE, msgs("validar-iban").guide);
