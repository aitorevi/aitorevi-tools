// Formatear HTML/CSS — lógica pura (sin DOM), testeable con Vitest.
// Recibe js-beautify inyectado (DI): en el navegador es window.beautifier (UMD
// vendorizado, con .html/.css/.js) y en los tests se carga el mismo UMD.
// Autodetecta el lenguaje: si el código empieza por '<' lo trata como HTML, si
// no, como CSS. js-beautify sólo embellece (no minifica ni valida estrictamente).

/** ¿El código parece markup (HTML) en lugar de CSS? */
export function looksLikeHtml(code) {
  return /^\s*</.test(code);
}

/**
 * Embellece HTML o CSS con sangría de 2 espacios (autodetectando el lenguaje).
 * @param {string} input
 * @param {{ html: Function, css: Function }} beautifier  js-beautify vendorizado
 */
export function format(input, beautifier) {
  const text = String(input == null ? "" : input);
  if (text.trim() === "") throw new Error("El código está vacío.");
  const beautify = looksLikeHtml(text) ? beautifier.html : beautifier.css;
  return beautify(text, {
    indent_size: 2,
    end_with_newline: false,
    preserve_newlines: true,
    max_preserve_newlines: 2,
  });
}

/** Ejemplo para precargar en la entrada: HTML compacto que mejora al formatear. */
export const SAMPLE =
  '<section class="card"><h2>aitorevi.tools</h2><ul><li>json</li><li>xml</li></ul><p>Todo en tu <a href="https://aitorevi.dev">navegador</a>.</p></section>';
