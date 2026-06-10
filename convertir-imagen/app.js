// Convertir imagen — UI. Muestra el resultado (preview real + ≈ KB) en vivo.

import {
  isImageFile,
  baseNameNoExt,
  extForMime,
  loadBitmap,
  drawToCanvas,
  canvasToBlob,
  triggerDownload,
  formatBytes,
  TARGETS,
  isLossy,
  convertedFileName,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";
import { msgs } from "../lib/i18n.js";

(() => {
  "use strict";

  const M = msgs("convertir-imagen");

  let bitmap = null;
  let base = "imagen";
  let original = null; // { name, size, type, w, h, url }
  let currentResult = null; // { blob }
  let resultUrl = null;
  let recomputeTimer = null;
  let recomputeToken = 0;

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const resultPreview = $("result-preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const estimateEl = $("estimate");
  const formatSel = $("target-format");
  const qualityField = $("quality-field");
  const qualityInput = $("quality");
  const qualityVal = $("quality-val");
  const convertBtn = $("convert-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  TARGETS.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.value;
    opt.textContent = t.label;
    formatSel.appendChild(opt);
  });
  formatSel.value = "image/jpeg";

  function syncQualityVisibility() {
    qualityField.style.display = isLossy(formatSel.value) ? "" : "none";
    qualityVal.textContent = `${qualityInput.value}%`;
  }

  async function computeResult() {
    const mime = formatSel.value;
    const quality = isLossy(mime) ? Number(qualityInput.value) / 100 : undefined;
    const canvas = drawToCanvas(bitmap, original.w, original.h);
    const blob = await canvasToBlob(canvas, mime, quality);
    return { blob };
  }

  async function recompute() {
    if (!bitmap) return;
    const token = ++recomputeToken;
    estimateEl.textContent = M.calculating;
    try {
      const r = await computeResult();
      if (token !== recomputeToken) return;
      currentResult = r;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(r.blob);
      resultPreview.src = resultUrl;
      const fmt = extForMime(formatSel.value).toUpperCase();
      estimateEl.innerHTML = `${M.resultLabel} <b>≈ ${formatBytes(r.blob.size)}</b> · ${original.w}×${original.h} · ${fmt}`;
    } catch (err) {
      if (token === recomputeToken) estimateEl.textContent = "";
      console.error(err);
    }
  }

  function scheduleRecompute() {
    syncQualityVisibility();
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recompute, 200);
  }

  async function loadFile(file) {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatus(M.notImage, "error");
      return;
    }
    setStatus(M.reading);
    try {
      bitmap = await loadBitmap(file);
      base = baseNameNoExt(file.name);
      if (original?.url) URL.revokeObjectURL(original.url);
      original = {
        name: file.name,
        size: file.size,
        type: file.type || "image/*",
        w: bitmap.width,
        h: bitmap.height,
        url: URL.createObjectURL(file),
      };
      resultPreview.src = original.url; // placeholder
      const label = (extForMime(original.type) || original.type).toUpperCase();
      infoEl.textContent = `${M.originalLabel} ${label} · ${original.w}×${original.h} · ${formatBytes(original.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      formatSel.value = original.type === "image/png" ? "image/jpeg" : "image/png";
      syncQualityVisibility();
      setStatus("");
      recompute();
    } catch (err) {
      console.error(err);
      setStatus(M.readError, "error");
    }
  }

  async function download() {
    if (!bitmap) return;
    convertBtn.disabled = true;
    try {
      const r = currentResult || (await computeResult());
      const mime = formatSel.value;
      triggerDownload(r.blob, convertedFileName(base, extForMime(mime)));
      setStatus(`${M.downloadedIn} ${extForMime(mime).toUpperCase()} · ${formatBytes(r.blob.size)}.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.convertError, "error");
    } finally {
      convertBtn.disabled = false;
    }
  }

  function reset() {
    bitmap = null;
    currentResult = null;
    if (original?.url) URL.revokeObjectURL(original.url);
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    original = null;
    fileInput.value = "";
    workspace.classList.add("hidden");
    loader.classList.remove("hidden");
    estimateEl.textContent = "";
    setStatus("");
  }

  wireDropzone({ dropzone, input: fileInput, onFiles: loadFile });
  $("reset-btn").addEventListener("click", reset);
  formatSel.addEventListener("change", scheduleRecompute);
  qualityInput.addEventListener("input", scheduleRecompute);
  convertBtn.addEventListener("click", download);

  syncQualityVisibility();
})();
