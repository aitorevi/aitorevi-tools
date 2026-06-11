// Helper compartido de la sección "Código": monta la UI común (entrada →
// formatear / minificar → copiar) y recibe la lógica pura de cada herramienta.
// Sin red ni dependencias externas: solo DOM + los textos i18n de runtime.
import { msgs } from "./i18n.js";

/**
 * Monta una herramienta de código dentro de `mount`.
 * @param {Object} opts
 * @param {string|HTMLElement} opts.mount   selector o nodo contenedor
 * @param {string} opts.toolId              id de la tool (para los textos i18n)
 * @param {(input: string) => string} opts.format    formatea (puede lanzar Error)
 * @param {(input: string) => string} [opts.minify]  minifica (opcional)
 * @param {string} [opts.sample]            texto de ejemplo para "Probar ejemplo"
 * @param {string} [opts.inputLabel]        etiqueta accesible de la entrada (opcional)
 */
export function mountCodeTool({ mount, toolId, format, minify, sample, inputLabel }) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;
  if (!root || typeof format !== "function") return;

  const M = msgs(toolId);
  const inLabel = inputLabel || M.codeInput;
  const hasMinify = typeof minify === "function";
  const hasSample = typeof sample === "string" && sample.length > 0;

  root.innerHTML = `
    <div class="code-tool">
      <div class="code-io">
        <label class="code-pane">
          <span class="field-label">${inLabel}</span>
          <textarea class="code-area" data-role="input" spellcheck="false"
                    autocapitalize="off" autocomplete="off" autocorrect="off"
                    placeholder="${M.codePlaceholder}" aria-label="${inLabel}"></textarea>
        </label>
        <div class="code-pane code-pane-out">
          <span class="field-label">${M.codeOutput}</span>
          <textarea class="code-area code-out" data-role="output" readonly
                    spellcheck="false" aria-label="${M.codeOutput}"></textarea>
          <button class="code-copy" type="button" data-act="copy" disabled
                  aria-label="${M.codeCopy}" data-copy-label="${M.codeCopy}" data-copied-label="${M.codeCopied}">
            <svg class="code-copy-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
            <svg class="code-copy-check" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span class="code-copy-tip" aria-hidden="true">${M.codeCopy}</span>
          </button>
        </div>
      </div>
      <p class="code-alert" data-role="alert" role="alert"></p>
      <div class="actions">
        <button class="btn primary" type="button" data-act="format">${M.codeFormat}</button>
        ${hasMinify ? `<button class="btn" type="button" data-act="minify">${M.codeMinify}</button>` : ""}
        ${hasSample ? `<button class="btn" type="button" data-act="sample">${M.codeSample}</button>` : ""}
      </div>
    </div>`;

  const input = root.querySelector('[data-role="input"]');
  const output = root.querySelector('[data-role="output"]');
  const alertBox = root.querySelector('[data-role="alert"]');
  const formatBtn = root.querySelector('[data-act="format"]');
  const minifyBtn = root.querySelector('[data-act="minify"]');
  const sampleBtn = root.querySelector('[data-act="sample"]');
  const copyBtn = root.querySelector('[data-act="copy"]');
  let copyTimer = null;

  const setOutput = (text) => {
    output.value = text;
    copyBtn.disabled = text.length === 0;
  };
  const clearAlert = () => { alertBox.textContent = ""; };
  const syncInputState = () => {
    const empty = input.value.trim().length === 0;
    formatBtn.disabled = empty;
    if (minifyBtn) minifyBtn.disabled = empty;
  };
  const run = (fn) => {
    clearAlert();
    try {
      setOutput(fn(input.value));
    } catch (e) {
      setOutput("");
      alertBox.textContent = `${M.codeError} ${(e && e.message) || e}`.trim();
    }
  };

  input.addEventListener("input", syncInputState);
  formatBtn.addEventListener("click", () => run(format));
  if (minifyBtn) minifyBtn.addEventListener("click", () => run(minify));
  if (sampleBtn) {
    sampleBtn.addEventListener("click", () => {
      input.value = sample;
      clearAlert();
      syncInputState();
      input.focus();
    });
  }
  const copyTip = copyBtn.querySelector(".code-copy-tip");
  copyBtn.addEventListener("click", async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); } catch { /* feedback igual */ }
    copyBtn.setAttribute("data-copied", "true");
    copyBtn.setAttribute("aria-label", M.codeCopied);
    if (copyTip) copyTip.textContent = M.codeCopied;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.setAttribute("data-copied", "false");
      copyBtn.setAttribute("aria-label", M.codeCopy);
      if (copyTip) copyTip.textContent = M.codeCopy;
    }, 2000);
  });

  syncInputState();
}
