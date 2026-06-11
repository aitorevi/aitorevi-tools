// Botón de copiar reutilizable, con el mismo aspecto que el de las herramientas
// de código (.code-copy: icono que pasa a un check verde + tooltip). Para las
// utilidades con UI propia (JWT, etc.) que no usan mountCodeTool.
const ICON_COPY =
  '<svg class="code-copy-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>';
const ICON_CHECK =
  '<svg class="code-copy-check" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>';

/** Crea un botón de copiar (deshabilitado de inicio). `labels = { copy, copied }`. */
export function createCopyButton(labels) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "code-copy";
  btn.disabled = true;
  btn.setAttribute("aria-label", labels.copy);
  btn.innerHTML = `${ICON_COPY}${ICON_CHECK}<span class="code-copy-tip" aria-hidden="true">${labels.copy}</span>`;
  return btn;
}

/**
 * Cablea un botón de copiar: copia `getText()` y muestra el check un instante.
 * Devuelve una función `sync()` que habilita/deshabilita el botón según haya texto.
 */
export function wireCopyButton(btn, getText, labels) {
  const tip = btn.querySelector(".code-copy-tip");
  let timer = null;
  btn.addEventListener("click", async () => {
    const text = getText();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* feedback igual */ }
    btn.setAttribute("data-copied", "true");
    btn.setAttribute("aria-label", labels.copied);
    if (tip) tip.textContent = labels.copied;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      btn.setAttribute("data-copied", "false");
      btn.setAttribute("aria-label", labels.copy);
      if (tip) tip.textContent = labels.copy;
    }, 2000);
  });
  return () => { btn.disabled = !getText(); };
}
