// Comprimir imagen — UI. Datos/helpers en lib.js; Canvas aquí.

import {
  isImageFile,
  baseNameNoExt,
  extForMime,
  fitDimensions,
  loadBitmap,
  drawToCanvas,
  canvasToBlob,
  triggerDownload,
  formatBytes,
  MAX_SIDES,
  reductionPercent,
  compressedFileName,
} from "./lib.js";

(() => {
  "use strict";

  let bitmap = null;
  let base = "imagen";
  let original = null; // { name, size, w, h, url }

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const previewImg = $("preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const formatSel = $("format");
  const maxSel = $("max-side");
  const qualityInput = $("quality");
  const qualityVal = $("quality-val");
  const compressBtn = $("compress-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  MAX_SIDES.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = String(m.value);
    opt.textContent = m.label;
    maxSel.appendChild(opt);
  });

  function syncLabels() {
    qualityVal.textContent = `${qualityInput.value}%`;
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
        w: bitmap.width,
        h: bitmap.height,
        url: URL.createObjectURL(file),
      };
      previewImg.src = original.url;
      infoEl.textContent = `${original.w}×${original.h} · ${formatBytes(original.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo leer la imagen.", "error");
    }
  }

  async function compress() {
    if (!bitmap) return;
    compressBtn.disabled = true;
    setStatus("Comprimiendo…");
    try {
      const mime = formatSel.value;
      const maxSide = Number(maxSel.value);
      const quality = Number(qualityInput.value) / 100;
      const { w, h } = fitDimensions(original.w, original.h, maxSide);
      const canvas = drawToCanvas(bitmap, w, h);
      const blob = await canvasToBlob(canvas, mime, quality);
      const pct = reductionPercent(original.size, blob.size);
      triggerDownload(blob, compressedFileName(base, extForMime(mime)));
      const note =
        blob.size < original.size
          ? `−${pct}% (${formatBytes(original.size)} → ${formatBytes(blob.size)})`
          : `${formatBytes(blob.size)} (sin reducción; prueba menos calidad o tamaño)`;
      setStatus(`Comprimida: ${note}.`, blob.size < original.size ? "ok" : "");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo comprimir la imagen.", "error");
    } finally {
      compressBtn.disabled = false;
    }
  }

  function reset() {
    bitmap = null;
    if (original?.url) URL.revokeObjectURL(original.url);
    original = null;
    fileInput.value = "";
    workspace.classList.add("hidden");
    loader.classList.remove("hidden");
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
  qualityInput.addEventListener("input", syncLabels);
  compressBtn.addEventListener("click", compress);

  syncLabels();
})();
