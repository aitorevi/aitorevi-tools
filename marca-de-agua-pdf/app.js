// Marca de agua PDF — UI. Lógica en lib.js (testeable); aquí el DOM.

import {
  sanitizeBaseName,
  formatBytes,
  isPdf,
  triggerDownload,
  addWatermark,
  watermarkedFileName,
} from "./lib.js";

(() => {
  "use strict";

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
      setStatus("Ese archivo no parece un PDF.", "error");
      return;
    }
    setStatus("Leyendo el PDF…");
    try {
      srcBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      baseName = sanitizeBaseName(file.name);
      fileNameEl.textContent = file.name;
      fileMetaEl.textContent = `${pageCount} ${pageCount === 1 ? "página" : "páginas"} · ${formatBytes(file.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo leer el PDF. Puede estar dañado o protegido.", "error");
    }
  }

  async function apply() {
    if (!srcBytes) return;
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Escribe el texto de la marca de agua.", "error");
      return;
    }
    applyBtn.disabled = true;
    setStatus("Aplicando la marca de agua…");
    try {
      const bytes = await addWatermark(window.PDFLib, srcBytes, {
        text,
        opacity: Number(opacityInput.value) / 100,
        fontSize: Number(sizeInput.value),
      });
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), watermarkedFileName(baseName));
      setStatus(`PDF con marca de agua (${pageCount} ${pageCount === 1 ? "página" : "páginas"}) descargado.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo aplicar la marca de agua.", "error");
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
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
    window.addEventListener(evt, (e) => e.preventDefault())
  );
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.add("dragover"))
  );
  ["dragleave", "dragend"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove("dragover"))
  );
  window.addEventListener("drop", (e) => {
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
  fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));
  $("reset-btn").addEventListener("click", reset);
  opacityInput.addEventListener("input", syncLabels);
  sizeInput.addEventListener("input", syncLabels);
  applyBtn.addEventListener("click", apply);

  syncLabels();
})();
