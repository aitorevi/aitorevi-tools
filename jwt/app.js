// Decodificar JWT — cableado del DOM (UI propia; no usa mountCodeTool). La
// lógica pura vive en ./lib.js. Todo en local: el token nunca sale del navegador.
import { decodeJwt, unixToIso, isExpired, SAMPLE } from "./lib.js";
import { GUIDE } from "./guide.js";
import { msgs } from "../lib/i18n.js";
import { createCopyButton, wireCopyButton } from "../lib/copy-button.js";
import { renderGuide } from "../lib/tool-guide.js";

(() => {
  "use strict";
  const M = msgs("jwt");
  const $ = (id) => document.getElementById(id);
  const input = $("jwt-input");
  const alertBox = $("jwt-alert");
  const info = $("jwt-info");
  const headerOut = $("jwt-header");
  const payloadOut = $("jwt-payload");
  if (!input) return;

  const labels = { copy: M.codeCopy, copied: M.codeCopied };
  const addCopy = (textarea) => {
    const btn = createCopyButton(labels);
    textarea.closest(".code-pane-out").appendChild(btn);
    return wireCopyButton(btn, () => textarea.value, labels);
  };
  const syncHeaderCopy = addCopy(headerOut);
  const syncPayloadCopy = addCopy(payloadOut);

  const fmtClaim = (label, seconds) => {
    const iso = unixToIso(seconds);
    return iso ? `${label} ${iso}` : null;
  };

  function buildInfo(header, payload) {
    const bits = [];
    if (header.alg) bits.push(`<b>alg</b> ${esc(header.alg)}`);
    if (header.typ) bits.push(`<b>typ</b> ${esc(header.typ)}`);
    if (typeof payload.exp === "number") {
      const iso = unixToIso(payload.exp);
      bits.push(
        isExpired(payload)
          ? `<span class="jwt-expired">${M.expired} (${iso})</span>`
          : `${M.expires} ${iso}`
      );
    }
    const iat = fmtClaim(M.issued, payload.iat);
    if (iat) bits.push(iat);
    return bits.join(" · ");
  }

  const esc = (s) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function render() {
    alertBox.textContent = "";
    info.innerHTML = "";
    headerOut.value = "";
    payloadOut.value = "";
    const raw = input.value.trim();
    if (raw) {
      try {
        const { header, payload } = decodeJwt(raw);
        headerOut.value = JSON.stringify(header, null, 2);
        payloadOut.value = JSON.stringify(payload, null, 2);
        info.innerHTML = buildInfo(header, payload);
      } catch (e) {
        alertBox.textContent = `${M.codeError} ${(e && e.message) || e}`;
      }
    }
    syncHeaderCopy();
    syncPayloadCopy();
  }

  input.addEventListener("input", render);
  input.value = SAMPLE; // precargado, como las demás herramientas
  render();
  renderGuide(document.getElementById("jwt-guide"), GUIDE, M.guide);
})();
