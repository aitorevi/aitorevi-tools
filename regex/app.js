// Tester de regex — cableado del DOM (UI propia; no usa mountCodeTool). La
// lógica pura vive en ./lib.js. Todo en local, sin red.
import { findMatches, highlightHtml, SAMPLE_PATTERN, SAMPLE_FLAGS, SAMPLE_TEXT } from "./lib.js";
import { GUIDE } from "./guide.js";
import { renderGuide } from "../lib/tool-guide.js";
import { msgs, fmt, plural } from "../lib/i18n.js";

(() => {
  "use strict";
  const M = msgs("regex");
  const $ = (id) => document.getElementById(id);
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

  for (const el of [patternEl, flagsEl, textEl]) el.addEventListener("input", render);

  // Precargado, como las demás herramientas.
  patternEl.value = SAMPLE_PATTERN;
  flagsEl.value = SAMPLE_FLAGS;
  textEl.value = SAMPLE_TEXT;
  render();
  renderGuide($("regex-guide"), GUIDE, M.guide);
})();
