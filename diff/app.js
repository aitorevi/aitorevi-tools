// Diff de texto — cableado del DOM (UI propia; no usa mountCodeTool). La lógica
// pura vive en ./lib.js. Todo en local, sin red.
import { diffLines, diffStats, SAMPLE_A, SAMPLE_B } from "./lib.js";
import { msgs } from "../lib/i18n.js";
import { createWrapToggle } from "../lib/wrap-toggle.js";

(() => {
  "use strict";
  const M = msgs("diff");
  const $ = (id) => document.getElementById(id);
  const aEl = $("diff-a");
  const bEl = $("diff-b");
  const output = $("diff-output");
  const summary = $("diff-summary");
  const alertBox = $("diff-alert");
  if (!aEl) return;

  // Por defecto sin ajuste de línea (mantiene la alineación exacta de líneas).
  const wrapLabels = { wrap: M.codeWrap };
  for (const el of [aEl, bEl, output]) {
    el.closest(".code-pane").querySelector(".code-bar-actions").append(createWrapToggle(el, false, wrapLabels));
  }

  const PREFIX = { eq: " ", add: "+", del: "−" };
  const esc = (s) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function render() {
    alertBox.textContent = "";
    try {
      const parts = diffLines(aEl.value, bEl.value);
      output.innerHTML = parts
        .map((p) => `<div class="diff-line diff-${p.type}">${PREFIX[p.type]} ${esc(p.line)}</div>`)
        .join("");
      const { added, removed } = diffStats(parts);
      summary.textContent =
        added === 0 && removed === 0 ? M.identical : `+${added} −${removed}`;
    } catch (e) {
      output.textContent = "";
      summary.textContent = "";
      alertBox.textContent = `${M.codeError} ${(e && e.message) || e}`;
    }
  }

  aEl.addEventListener("input", render);
  bEl.addEventListener("input", render);

  // Precargado, como las demás herramientas.
  aEl.value = SAMPLE_A;
  bEl.value = SAMPLE_B;
  render();
})();
