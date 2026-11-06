// Carga YAML con uno o varios documentos (`---`) — lógica pura, js-yaml inyectado.
// js-yaml.load solo admite un documento y lanza "expected a single document";
// varios documentos son YAML válido, así que en ese caso se usa loadAll. Con un
// único documento el comportamiento es exactamente el de load.

/** Siempre devuelve un array de documentos (1 elemento en el caso habitual). */
export function loadDocuments(jsyaml, text) {
  try {
    return [jsyaml.load(text)];
  } catch (e) {
    if (e && /expected a single document/.test(e.reason)) return jsyaml.loadAll(text);
    throw e;
  }
}
