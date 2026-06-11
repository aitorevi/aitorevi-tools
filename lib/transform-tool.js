// Helper compartido para utilidades de "transformar en vivo": una entrada, una
// salida y un selector opcional (modo/algoritmo). Convierte al teclear o cambiar
// el selector. transform puede ser síncrono o asíncrono. Reutiliza .code-* y el
// botón de copiar. Sin red ni dependencias externas.
import { msgs } from "./i18n.js";
import { createCopyButton, wireCopyButton } from "./copy-button.js";

/**
 * @param {Object} opts
 * @param {string|HTMLElement} opts.mount
 * @param {string} opts.toolId
 * @param {(input: string, value?: string) => (string|Promise<string>)} opts.transform
 * @param {Object} [opts.select]  { labelKey, value, choices:[{value,label?,labelKey?}] }
 * @param {string} [opts.sample]  texto precargado en la entrada
 * @param {string} [opts.inputLabel]  clave i18n para la etiqueta de entrada
 * @param {string} [opts.outputLabel] clave i18n para la etiqueta de salida
 */
export function mountTransformTool({ mount, toolId, transform, select, sample, inputLabel, outputLabel }) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;
  if (!root || typeof transform !== "function") return;

  const M = msgs(toolId);
  const inLabel = (inputLabel && M[inputLabel]) || M.codeInput;
  const outLabel = (outputLabel && M[outputLabel]) || M.codeOutput;
  const hasSelect = select && Array.isArray(select.choices) && select.choices.length > 0;
  const optLabel = (c) => M[c.labelKey] || c.label || c.value;

  const controls = hasSelect
    ? `<div class="code-controls">
        <label class="field code-select">
          <span class="field-label">${M[select.labelKey] || ""}</span>
          <select data-role="select">${select.choices
            .map((c) => `<option value="${c.value}"${c.value === select.value ? " selected" : ""}>${optLabel(c)}</option>`)
            .join("")}</select>
        </label>
      </div>`
    : "";

  root.innerHTML = `
    <div class="code-tool">
      ${controls}
      <div class="code-io">
        <label class="code-pane">
          <div class="code-bar">
            <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="code-bar-label">${inLabel}</span>
          </div>
          <textarea class="code-area" data-role="input" spellcheck="false"
                    autocapitalize="off" autocomplete="off" autocorrect="off"
                    placeholder="${M.transformPlaceholder || M.codePlaceholder}" aria-label="${inLabel}"></textarea>
        </label>
        <div class="code-pane code-pane-out">
          <div class="code-bar">
            <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="code-bar-label">${outLabel}</span>
          </div>
          <textarea class="code-area code-out" data-role="output" readonly
                    spellcheck="false" aria-label="${outLabel}"></textarea>
        </div>
      </div>
      <p class="code-alert" data-role="alert" role="alert"></p>
    </div>`;

  const input = root.querySelector('[data-role="input"]');
  const output = root.querySelector('[data-role="output"]');
  const alertBox = root.querySelector('[data-role="alert"]');
  const selectEl = root.querySelector('[data-role="select"]');

  const labels = { copy: M.codeCopy, copied: M.codeCopied };
  const copyBtn = createCopyButton(labels);
  output.closest(".code-pane-out").querySelector(".code-bar").appendChild(copyBtn);
  const syncCopy = wireCopyButton(copyBtn, () => output.value, labels);

  let token = 0;
  async function run() {
    alertBox.textContent = "";
    if (input.value === "") {
      output.value = "";
      syncCopy();
      return;
    }
    const my = ++token;
    try {
      const result = await transform(input.value, selectEl ? selectEl.value : undefined);
      if (my !== token) return; // descarta resultados asíncronos obsoletos
      output.value = result;
    } catch (e) {
      if (my !== token) return;
      output.value = "";
      alertBox.textContent = `${M.codeError} ${(e && e.message) || e}`;
    }
    syncCopy();
  }

  input.addEventListener("input", run);
  if (selectEl) selectEl.addEventListener("change", run);
  if (sample != null) input.value = sample;
  run();
}
