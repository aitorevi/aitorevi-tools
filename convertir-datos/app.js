// Conversor de datos — cableado del DOM. Lógica pura en ./lib.js.
import { convert, FORMATS, SAMPLE_CSV } from "./lib.js";
import { msgs } from "../lib/i18n.js";
import { createCopyButton, wireCopyButton } from "../lib/copy-button.js";
import { createWrapToggle } from "../lib/wrap-toggle.js";

(() => {
  "use strict";
  const M = msgs("convertir-datos");
  const $ = (id) => document.getElementById(id);

  const fromSel  = $("from-format");
  const toSel    = $("to-format");
  const swapBtn  = $("swap-btn");
  const inputEl  = $("input-data");
  const outputEl = $("output-data");
  const alertEl  = $("convert-alert");
  const inputLabel  = $("input-label");
  const outputLabel = $("output-label");
  if (!fromSel) return;

  const libs = {
    yaml: window.jsyaml,
    xml:  window.fxp,
    toml: window.SmolTOML,
  };

  const labels = { copy: M.codeCopy, copied: M.codeCopied };
  const wrapLabels = { wrap: M.codeWrap };
  const actionsOf = (el) => el.closest(".code-pane").querySelector(".code-bar-actions");

  actionsOf(inputEl).append(createWrapToggle(inputEl, false, wrapLabels));
  const copyBtn = createCopyButton(labels);
  actionsOf(outputEl).append(createWrapToggle(outputEl, false, wrapLabels));
  actionsOf(outputEl).appendChild(copyBtn);
  const syncCopy = wireCopyButton(copyBtn, () => outputEl.value, labels);

  const FMT_LABEL = Object.fromEntries(FORMATS.map(f => [f, f.toUpperCase()]));

  function updateLabels() {
    const from = fromSel.value, to = toSel.value;
    if (inputLabel)  inputLabel.textContent  = FMT_LABEL[from] || from;
    if (outputLabel) outputLabel.textContent = FMT_LABEL[to]   || to;
  }

  function getWarning(from, to, inputText) {
    if (to === 'toml' || to === 'xml') {
      if (from === 'csv' || inputText.trimStart().startsWith('[')) return 'warnWrap';
    }
    if (from === 'yaml' && to !== 'yaml') return 'warnYamlCoerce';
    return null;
  }

  function render() {
    alertEl.textContent = "";
    alertEl.classList.remove("code-alert--warn");
    outputEl.value = "";
    const text = inputEl.value;
    if (!text.trim()) { syncCopy(); return; }
    try {
      outputEl.value = convert(text, fromSel.value, toSel.value, libs);
      const warnKey = getWarning(fromSel.value, toSel.value, text);
      if (warnKey) {
        alertEl.classList.add("code-alert--warn");
        alertEl.textContent = M[warnKey] ?? warnKey;
      }
    } catch (e) {
      alertEl.textContent = `${M.convertError} ${(e && e.message) || e}`;
    }
    syncCopy();
  }

  swapBtn.addEventListener("click", () => {
    const prevFrom = fromSel.value;
    const prevTo = toSel.value;
    const prevInput = inputEl.value;
    fromSel.value = prevTo;
    toSel.value = prevFrom;
    inputEl.value = outputEl.value || prevInput;
    updateLabels();
    render();
  });

  fromSel.addEventListener("change", () => { updateLabels(); render(); });
  toSel.addEventListener("change",   () => { updateLabels(); render(); });
  inputEl.addEventListener("input",  render);

  // Precargado con CSV de muestra
  inputEl.value = SAMPLE_CSV;
  updateLabels();
  render();
})();
