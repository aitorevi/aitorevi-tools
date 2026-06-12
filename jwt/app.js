// JWT: decodificar y firmar — cableado del DOM.
// Lógica pura en ./lib.js (decode) y ./signer.js (sign). Sin librerías externas.
import { decodeJwt, unixToIso, isExpired, SAMPLE } from "./lib.js";
import { signJwt, SIGN_SAMPLE_PAYLOAD, SIGN_SAMPLE_SECRET } from "./signer.js";
import { GUIDE } from "./guide.js";
import { msgs } from "../lib/i18n.js";
import { createCopyButton, wireCopyButton } from "../lib/copy-button.js";
import { createWrapToggle } from "../lib/wrap-toggle.js";
import { renderGuide } from "../lib/tool-guide.js";

(() => {
  "use strict";
  const M = msgs("jwt");
  const $ = (id) => document.getElementById(id);

  // --- Decode ---
  const modeSelect   = $("jwt-mode");
  const decodeSection = $("jwt-decode-section");
  const signSection  = $("jwt-sign-section");
  const input        = $("jwt-input");
  const alertBox     = $("jwt-alert");
  const info         = $("jwt-info");
  const headerOut    = $("jwt-header");
  const payloadOut   = $("jwt-payload");
  if (!input) return;

  const labels = { copy: M.codeCopy, copied: M.codeCopied };
  const wrapLabels = { wrap: M.codeWrap };
  const actionsOf = (el) => el.closest(".code-pane").querySelector(".code-bar-actions");
  const addCopy = (textarea, defaultWrap = false) => {
    const actions = actionsOf(textarea);
    actions.prepend(createWrapToggle(textarea, defaultWrap, wrapLabels));
    const btn = createCopyButton(labels);
    actions.appendChild(btn);
    return wireCopyButton(btn, () => textarea.value, labels);
  };

  const syncHeaderCopy  = addCopy(headerOut, false);
  const syncPayloadCopy = addCopy(payloadOut, false);
  actionsOf(input).append(createWrapToggle(input, true, wrapLabels));

  const esc = (s) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

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
    const iat = unixToIso(payload.iat);
    if (iat) bits.push(`${M.issued} ${iat}`);
    return bits.join(" · ");
  }

  function renderDecode() {
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

  input.addEventListener("input", renderDecode);
  input.value = SAMPLE;
  renderDecode();

  // --- Sign ---
  const signPayload  = $("jwt-sign-payload");
  const secretInput  = $("jwt-secret");
  const algSelect    = $("jwt-sign-alg");
  const tokenOut     = $("jwt-token-out");
  const signAlert    = $("jwt-sign-alert");
  const syncTokenCopy = addCopy(tokenOut, true); // token largo → wrap on
  actionsOf(signPayload).append(createWrapToggle(signPayload, false, wrapLabels));

  async function renderSign() {
    signAlert.textContent = "";
    tokenOut.value = "";
    const payloadStr = signPayload.value.trim();
    const secret = secretInput.value;
    if (!payloadStr) { syncTokenCopy(); return; }
    try {
      JSON.parse(payloadStr); // valida que sea JSON válido
      const token = await signJwt(payloadStr, secret, algSelect.value);
      tokenOut.value = token;
    } catch (e) {
      signAlert.textContent = `${M.signError} ${(e && e.message) || e}`;
    }
    syncTokenCopy();
  }

  for (const el of [signPayload, secretInput, algSelect])
    el.addEventListener("input", renderSign);

  signPayload.value = SIGN_SAMPLE_PAYLOAD;
  secretInput.value = SIGN_SAMPLE_SECRET;

  // --- Cambio de modo ---
  modeSelect.addEventListener("change", () => {
    const isSign = modeSelect.value === "sign";
    decodeSection.hidden = isSign;
    signSection.hidden = !isSign;
    if (isSign) renderSign();
  });

  renderGuide($("jwt-guide"), GUIDE, M.guide);
})();
