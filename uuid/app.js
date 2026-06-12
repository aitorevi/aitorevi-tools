// Generador de UUID — cableado del DOM. Lógica pura en ./lib.js.
import { generateUUIDs } from "./lib.js";
import { msgs } from "../lib/i18n.js";
import { createCopyButton, wireCopyButton } from "../lib/copy-button.js";

(() => {
  "use strict";
  const M = msgs("uuid");
  const countSel = document.getElementById("uuid-count");
  const regenBtn = document.getElementById("uuid-regen");
  const outputEl = document.getElementById("uuid-out");
  const actionsEl = document.getElementById("uuid-actions");
  if (!countSel) return;

  const copyBtn = createCopyButton({ copy: M.codeCopy, copied: M.codeCopied });
  actionsEl.appendChild(copyBtn);
  const syncCopy = wireCopyButton(copyBtn, () => outputEl.value, { copy: M.codeCopy, copied: M.codeCopied });

  function generate() {
    outputEl.value = generateUUIDs(Number(countSel.value));
    syncCopy();
  }

  countSel.addEventListener("change", generate);
  regenBtn.addEventListener("click", generate);

  generate();
})();
