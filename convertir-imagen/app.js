// Convertir imagen — UI. Lógica pura/datos en lib.js; Canvas aquí.

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

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const previewImg = $("preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const formatSel = $("target-format");
  const qualityField = $("quality-field");
  const qualityInput = $("quality");
  const qualityVal = $("quality-val");
  const convertBtn = $("convert-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  // Rellena el selector de formatos.
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
      previewImg.src = original.url;
      const label = (extForMime(original.type) || original.type).toUpperCase();
      infoEl.textContent = `${label} · ${original.w}×${original.h} · ${formatBytes(original.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      // Por defecto, sugiere convertir a un formato distinto del de entrada.
      formatSel.value = original.type === "image/png" ? "image/jpeg" : "image/png";
      syncQualityVisibility();
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo leer la imagen.", "error");
    }
  }

  async function convert() {
    if (!bitmap) return;
    convertBtn.disabled = true;
    setStatus("Convirtiendo…");
    try {
      const mime = formatSel.value;
      const quality = isLossy(mime) ? Number(qualityInput.value) / 100 : undefined;
      const canvas = drawToCanvas(bitmap, original.w, original.h);
      const blob = await canvasToBlob(canvas, mime, quality);
      triggerDownload(blob, convertedFileName(base, extForMime(mime)));
      setStatus(`Convertido a ${extForMime(mime).toUpperCase()} · ${formatBytes(blob.size)}.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo convertir la imagen.", "error");
    } finally {
      convertBtn.disabled = false;
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
  formatSel.addEventListener("change", syncQualityVisibility);
  qualityInput.addEventListener("input", syncQualityVisibility);
  convertBtn.addEventListener("click", convert);

  syncQualityVisibility();
})();
