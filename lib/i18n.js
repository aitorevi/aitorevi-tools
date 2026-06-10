// i18n de runtime para los app.js: elige el idioma por `<html lang>` y expone los
// mensajes dinámicos generados en /i18n/strings.js (build.mjs). Sin red ni inline.
import { STRINGS } from "/i18n/strings.js";

const LANG = (document.documentElement.lang || "es").slice(0, 2) === "en" ? "en" : "es";

/** Mensajes de una herramienta (comunes + propios) para el idioma actual, con
 *  fallback a ES por clave. */
export function msgs(toolId) {
  const es = STRINGS.es || {};
  const cur = STRINGS[LANG] || {};
  return {
    ...(es._common || {}), ...(es[toolId] || {}),
    ...(cur._common || {}), ...(cur[toolId] || {}),
  };
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
