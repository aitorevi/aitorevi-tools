// Formatear JSON — lógica pura (sin DOM), testeable con Vitest.
// Delega en lib/json-format.js, que reescribe solo el espacio en blanco y no
// altera ningún valor (enteros grandes, claves duplicadas, forma de los números).
// Ambas funciones validan el JSON: si la sintaxis es inválida, `JSON.parse`
// lanza un SyntaxError nativo (con la posición del error) que se propaga para
// que la UI lo muestre. Sin textos de idioma aquí: la capa de UI los localiza.
import { formatJson, minifyJson } from "../lib/json-format.js";

/** Embellece el JSON con sangría de 2 espacios. Lanza si el JSON es inválido. */
export function format(input) {
  return formatJson(input, 2);
}

/** Minifica el JSON (sin espacios sobrantes). Lanza si el JSON es inválido. */
export function minify(input) {
  return minifyJson(input);
}

/** Ejemplo para "Probar ejemplo": JSON compacto que mejora al formatear. */
export const SAMPLE =
  '{"name":"aitorevi.tools","offline":true,"tools":["json","xml","sql"],"meta":{"stars":42,"tags":["dev","privacy"]}}';
