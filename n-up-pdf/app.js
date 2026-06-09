// n-up PDF — UI. Lógica en lib.js (testeable); aquí el DOM.

import {
  sanitizeBaseName,
  formatBytes,
  isPdf,
  triggerDownload,
  nUpPdf,
  nUpFileName,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";

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
  const perInput = $("nup-per");
  const orientInput = $("nup-orient");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
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
    const perSheet = Number(perInput.value);
    applyBtn.disabled = true;
    setStatus("Recolocando las páginas…");
    try {
      const bytes = await nUpPdf(window.PDFLib, srcBytes, {
        perSheet,
        landscape: orientInput.value === "landscape",
      });
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), nUpFileName(baseName, perSheet));
      const sheets = Math.ceil(pageCount / perSheet);
      setStatus(`PDF con ${perSheet} por hoja (${sheets} ${sheets === 1 ? "hoja" : "hojas"}) descargado.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo recolocar el PDF.", "error");
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

  wireDropzone({ dropzone, input: fileInput, onFiles: loadFile });
  $("reset-btn").addEventListener("click", reset);
  applyBtn.addEventListener("click", apply);
})();
