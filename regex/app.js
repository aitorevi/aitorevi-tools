// Tester de regex — cableado del DOM (UI propia; no usa mountCodeTool). La
// lógica pura vive en ./lib.js. Todo en local, sin red.
import { findMatches, highlightHtml, SAMPLE_PATTERN, SAMPLE_FLAGS, SAMPLE_TEXT } from "./lib.js";
import { GUIDE } from "./guide.js";
import { msgs, fmt, plural } from "../lib/i18n.js";

(() => {
  "use strict";
  const M = msgs("regex");
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const patternEl = $("re-pattern");
  const flagsEl = $("re-flags");
  const textEl = $("re-text");
  const output = $("re-output");
  const count = $("re-count");
  const alertBox = $("re-alert");
  if (!patternEl) return;

  function render() {
    alertBox.textContent = "";
    const pattern = patternEl.value;
    const text = textEl.value;
    if (pattern === "") {
      output.textContent = text;
      count.textContent = "";
      return;
    }
    try {
      const matches = findMatches(pattern, flagsEl.value, text);
      output.innerHTML = highlightHtml(text, matches);
      count.textContent = fmt(plural(matches.length, M.matchesCount), { n: matches.length });
    } catch (e) {
      output.textContent = text;
      count.textContent = "";
      alertBox.textContent = `${M.codeError} ${(e && e.message) || e}`;
    }
  }

  function renderGuide() {
    const host = $("regex-guide");
    const g = M.guide;
    if (!host || !g) return;
    const groups = GUIDE.map((group) => {
      const rows = group.rows
        .map(
          ([token, key]) =>
            `<dt><code>${esc(token)}</code></dt><dd>${esc((g.desc && g.desc[key]) || key)}</dd>`
        )
        .join("");
      return `<div class="regex-guide-group">
          <h3>${esc((g.groups && g.groups[group.name]) || group.name)}</h3>
          <dl>${rows}</dl>
        </div>`;
    }).join("");
    host.innerHTML = `<h2 class="regex-guide-title">${esc(g.title)}</h2>
      <p class="regex-guide-intro">${esc(g.intro)}</p>
      <div class="regex-guide-grid">${groups}</div>`;
  }

  for (const el of [patternEl, flagsEl, textEl]) el.addEventListener("input", render);

  // Precargado, como las demás herramientas.
  patternEl.value = SAMPLE_PATTERN;
  flagsEl.value = SAMPLE_FLAGS;
  textEl.value = SAMPLE_TEXT;
  render();
  renderGuide();
})();
