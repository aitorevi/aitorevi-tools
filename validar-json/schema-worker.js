// Worker de "Validar JSON" (modo schema). La validación pesada corre aquí, fuera del
// hilo principal: una regex catastrófica en un `pattern` solo bloquea este Worker, que
// el hilo principal puede terminar si tarda demasiado. La librería (vendor/json-schema.min.js)
// se carga solo aquí, y solo cuando el usuario activa el modo schema.
import "../vendor/json-schema.min.js"; // deja self.JsonSchema = { Validator, metaschemas }
import { checkSchemaAndDocument } from "../lib/validators/json-schema.js";

self.addEventListener("message", ({ data }) => {
  const { id, schema, doc, draft } = data;
  self.postMessage({ id, raw: checkSchemaAndDocument(self.JsonSchema, schema, doc, draft) });
});
