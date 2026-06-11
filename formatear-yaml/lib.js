// Formatear YAML — lógica pura (sin DOM), testeable con Vitest.
// Recibe js-yaml inyectado (DI): en el navegador es window.jsyaml (UMD
// vendorizado) y en los tests se carga el mismo UMD. Formatear = load + dump,
// con lo que de paso valida la sintaxis (load lanza si el YAML es inválido).

/**
 * Normaliza el YAML a estilo bloque con sangría de 2 espacios. Valida de paso.
 * @param {string} yaml
 * @param {{ load: Function, dump: Function }} jsyaml  librería js-yaml vendorizada
 */
export function format(yaml, jsyaml) {
  const text = String(yaml == null ? "" : yaml);
  if (text.trim() === "") throw new Error("El YAML está vacío.");
  const doc = jsyaml.load(text); // lanza YAMLException si la sintaxis es inválida
  if (doc === undefined) throw new Error("El YAML no contiene ningún dato.");
  return jsyaml
    .dump(doc, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false })
    .replace(/\n$/, "");
}

/** Ejemplo para precargar en la entrada: YAML desordenado que mejora al formatear. */
export const SAMPLE =
  "name:   aitorevi.tools\noffline: true\ntools:\n    - json\n    - xml\n    - sql\nmeta: {stars: 42, tags: [dev, privacy]}";
