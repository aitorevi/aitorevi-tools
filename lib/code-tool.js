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
        <div class="code-pane">
          <span class="field-label">${M.codeOutput}</span>
          <textarea class="code-area code-out" data-role="output" readonly
                    spellcheck="false" aria-label="${M.codeOutput}"></textarea>
        </div>
      </div>
      <p class="code-alert" data-role="alert" role="alert"></p>
      <div class="actions">
        <button class="btn primary" type="button" data-act="format">${M.codeFormat}</button>
        ${hasMinify ? `<button class="btn" type="button" data-act="minify">${M.codeMinify}</button>` : ""}
        ${hasSample ? `<button class="btn" type="button" data-act="sample">${M.codeSample}</button>` : ""}
        <button class="btn ghost" type="button" data-act="copy" disabled>${M.codeCopy}</button>
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
  copyBtn.addEventListener("click", async () => {
    if (!output.value) return;
    try { await navigator.clipboard.writeText(output.value); } catch { /* feedback igual */ }
    copyBtn.textContent = M.codeCopied;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.textContent = M.codeCopy; }, 1500);
  });

  syncInputState();
}
