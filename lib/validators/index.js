// Registro de validadores. Cada validador es `(texto: string) => resultado`
// (ver ./result.js). Para añadir un formato (XML, YAML, TOML…) se crea su módulo
// y se registra aquí; la UI solo conoce esta interfaz.
import { validateJson } from "./json.js";
import { validateXml } from "./xml.js";

export const VALIDATORS = {
  json: validateJson,
  xml: (text) => validateXml(text), // usa window.DOMParser (solo navegador)
};

/** Valida `text` con el validador registrado como `id`. Lanza si no existe. */
export function validate(id, text) {
  const validator = VALIDATORS[id];
  if (!validator) throw new Error(`Unknown validator: ${id}`);
  return validator(text);
}
