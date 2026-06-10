// Formatear JSON — lógica pura (sin DOM), testeable con Vitest.
// Ambas funciones validan el JSON: si la sintaxis es inválida, `JSON.parse`
// lanza un SyntaxError nativo (con la posición del error) que se propaga para
// que la UI lo muestre. Sin textos de idioma aquí: la capa de UI los localiza.

/** Embellece el JSON con sangría de 2 espacios. Lanza si el JSON es inválido. */
export function format(input) {
  return JSON.stringify(JSON.parse(input), null, 2);
}

/** Minifica el JSON (sin espacios sobrantes). Lanza si el JSON es inválido. */
export function minify(input) {
  return JSON.stringify(JSON.parse(input));
}

/** Ejemplo para "Probar ejemplo": JSON compacto que mejora al formatear. */
export const SAMPLE =
  '{"name":"aitorevi.tools","offline":true,"tools":["json","xml","sql"],"meta":{"stars":42,"tags":["dev","privacy"]}}';
