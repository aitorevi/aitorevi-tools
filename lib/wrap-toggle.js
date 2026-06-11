// Botón para alternar el ajuste de línea (word-wrap) de un .code-area. Añade o
// quita la clase .is-wrapped (la define styles.css): activo → el texto se ajusta
// al ancho sin scroll horizontal; inactivo → una línea por renglón con scroll.
// Mismo aspecto que el botón de copiar (en la barra del panel).
const ICON =
  '<svg class="code-wrap-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3 3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"/></svg>';

/**
 * Crea el botón de word-wrap para un .code-area (textarea o div).
 * @param {HTMLElement} el       el .code-area cuyo ajuste se controla
 * @param {boolean} defaultOn    estado inicial (true = ajustado)
 * @param {{ wrap: string }} labels  textos i18n (aria-label / tooltip)
 */
export function createWrapToggle(el, defaultOn, labels) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "code-wrap";
  btn.innerHTML = `${ICON}<span class="code-copy-tip" aria-hidden="true">${labels.wrap}</span>`;

  const apply = (wrapped) => {
    el.classList.toggle("is-wrapped", wrapped);
    btn.setAttribute("aria-pressed", String(wrapped));
    btn.setAttribute("aria-label", labels.wrap);
  };
  apply(!!defaultOn);
  btn.addEventListener("click", () => apply(!el.classList.contains("is-wrapped")));
  return btn;
}
