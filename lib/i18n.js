// i18n de runtime para los app.js: elige el idioma por `<html lang>` y expone los
// mensajes dinámicos generados en /i18n/strings.js (build.mjs). Sin red ni inline.
import { STRINGS } from "/i18n/strings.js";

const LANG = (document.documentElement.lang || "es").slice(0, 2) === "en" ? "en" : "es";

/** Mensajes de una herramienta para el idioma actual (con fallback a ES). */
export function msgs(toolId) {
  return (STRINGS[LANG] && STRINGS[LANG][toolId]) || (STRINGS.es && STRINGS.es[toolId]) || {};
}

/** Rellena {placeholders} de una plantilla: fmt("Página {n}", { n: 3 }). */
export function fmt(tpl, vars) {
  return String(tpl == null ? "" : tpl).replace(/\{(\w+)\}/g, (_, k) =>
    vars && k in vars ? vars[k] : ""
  );
}

/** Forma singular/plural: plural(n, { one, many }). */
export function plural(n, forms) {
  return n === 1 ? forms && forms.one : forms && forms.many;
}
