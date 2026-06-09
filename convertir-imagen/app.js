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

(() => {
  "use strict";

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
    estimateEl.textContent = "Calculando resultado…";
    try {
      const r = await computeResult();
      if (token !== recomputeToken) return;
      currentResult = r;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(r.blob);
      resultPreview.src = resultUrl;
      const fmt = extForMime(formatSel.value).toUpperCase();
      estimateEl.innerHTML = `Resultado: <b>≈ ${formatBytes(r.blob.size)}</b> · ${original.w}×${original.h} · ${fmt}`;
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
      setStatus("Eso no parece una imagen.", "error");
      return;
    }
    setStatus("Leyendo la imagen…");
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
      infoEl.textContent = `Original: ${label} · ${original.w}×${original.h} · ${formatBytes(original.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      formatSel.value = original.type === "image/png" ? "image/jpeg" : "image/png";
      syncQualityVisibility();
      setStatus("");
      recompute();
    } catch (err) {
      console.error(err);
      setStatus("No se pudo leer la imagen.", "error");
    }
  }

  async function download() {
    if (!bitmap) return;
    convertBtn.disabled = true;
    try {
      const r = currentResult || (await computeResult());
      const mime = formatSel.value;
      triggerDownload(r.blob, convertedFileName(base, extForMime(mime)));
      setStatus(`Descargado en ${extForMime(mime).toUpperCase()} · ${formatBytes(r.blob.size)}.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo convertir la imagen.", "error");
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
  formatSel.addEventListener("change", scheduleRecompute);
  qualityInput.addEventListener("input", scheduleRecompute);
  convertBtn.addEventListener("click", download);

  syncQualityVisibility();
})();
