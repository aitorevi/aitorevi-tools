// Cliente del Worker de schema: comprueba la sintaxis y prepara el trabajo en el hilo
// principal, manda lo pesado al Worker con un límite de tiempo y traduce la respuesta.
// El Worker se crea la primera vez que hace falta. Sin red: solo scripts del propio sitio.
import { finishSchemaCheck, prepareSchemaCheck } from "../lib/validators/json-schema.js";
import { fail, makeError } from "../lib/validators/result.js";

/**
 * @param {Object} opts
 * @param {string|URL} opts.workerUrl
 * @param {number} [opts.timeoutMs=4000]  límite de la validación pesada
 * @returns {(documentText: string, schemaText: string) => Promise<Object>}
 */
export function createSchemaChecker({ workerUrl, timeoutMs = 4000 }) {
  let worker = null;
  let seq = 0;
  let cancelPending = null;

  const stop = () => {
    if (worker) worker.terminate();
    worker = null;
  };

  return async function check(documentText, schemaText) {
    const prepared = prepareSchemaCheck(documentText, schemaText);
    if (prepared.early) return prepared.early;

    // Gana la última petición: si la anterior sigue en marcha se cancela y se
    // reinicia el Worker (así una validación lenta no retrasa a la siguiente).
    if (cancelPending) cancelPending();
    const id = ++seq;
    if (!worker) worker = new Worker(workerUrl, { type: "module" });
    const w = worker;

    const raw = await new Promise((resolve) => {
      const finish = (value) => {
        clearTimeout(timer);
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        cancelPending = null;
        resolve(value);
      };
      const onMessage = ({ data }) => { if (data.id === id) finish(data.raw); };
      const onError = (e) => { stop(); finish({ stage: "thrown", thrown: { name: "Error", message: (e && e.message) || "Worker error" } }); };
      const timer = setTimeout(() => { stop(); finish({ stage: "timeout" }); }, timeoutMs);
      cancelPending = () => { stop(); finish({ stage: "cancelled" }); };
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      w.postMessage({ id, schema: prepared.run.schema, doc: prepared.run.doc, draft: prepared.run.draft });
    });

    if (raw.stage === "cancelled") return { valid: false, errors: [], meta: { stage: "cancelled" } };
    if (raw.stage === "timeout") {
      const error = makeError("Validation cancelled: it took too long", { hint: "timeout", source: "schema" });
      return fail([error], { stage: "timeout", draft: prepared.run.draft });
    }
    return finishSchemaCheck(prepared.ctx, raw);
  };
}
