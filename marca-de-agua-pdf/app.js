// Marca de agua PDF — UI. Lógica en lib.js (testeable); aquí el DOM.

import {
  sanitizeBaseName,
  formatBytes,
  isPdf,
  triggerDownload,
  addWatermark,
  watermarkedFileName,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";
import { msgs, fmt, plural } from "../lib/i18n.js";

(() => {
  "use strict";

  const M = msgs("marca-de-agua-pdf");

  const { PDFDocument } = window.PDFLib;

  let srcBytes = null;
  let baseName = "documento";
  let pageCount = 0;

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const fileNameEl = $("file-name");
  const fileMetaEl = $("file-meta");
  const statusEl = $("status");
  const applyBtn = $("apply-btn");
  const textInput = $("wm-text");
  const opacityInput = $("wm-opacity");
  const opacityVal = $("wm-opacity-val");
  const sizeInput = $("wm-size");
  const sizeVal = $("wm-size-val");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function syncLabels() {
    opacityVal.textContent = `${opacityInput.value}%`;
    sizeVal.textContent = `${sizeInput.value} pt`;
  }

  async function loadFile(file) {
    if (!file) return;
    if (!isPdf(file)) {
      setStatus(M.notPdf, "error");
      return;
    }
    setStatus(M.reading);
    try {
      srcBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      baseName = sanitizeBaseName(file.name);
      fileNameEl.textContent = file.name;
      fileMetaEl.textContent = `${pageCount} ${plural(pageCount, M.pages)} · ${formatBytes(file.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(M.readError, "error");
    }
  }

  async function apply() {
    if (!srcBytes) return;
    const text = textInput.value.trim();
    if (!text) {
      setStatus(M.needText, "error");
      return;
    }
    applyBtn.disabled = true;
    setStatus(M.applying);
    try {
      const bytes = await addWatermark(window.PDFLib, srcBytes, {
        text,
        opacity: Number(opacityInput.value) / 100,
        fontSize: Number(sizeInput.value),
      });
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), watermarkedFileName(baseName));
      setStatus(fmt(M.appliedOk, { n: pageCount, pages: plural(pageCount, M.pages) }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.applyError, "error");
    } finally {
      applyBtn.disabled = false;
    }
  }

  function reset() {
    srcBytes = null;
    pageCount = 0;
    fileInput.value = "";
    workspace.classList.add("hidden");
    loader.classList.remove("hidden");
    setStatus("");
  }

  // Eventos
  wireDropzone({ dropzone, input: fileInput, onFiles: loadFile });
  $("reset-btn").addEventListener("click", reset);
  opacityInput.addEventListener("input", syncLabels);
  sizeInput.addEventListener("input", syncLabels);
  applyBtn.addEventListener("click", apply);

  syncLabels();
})();
