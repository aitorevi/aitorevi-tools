// Quitar metadatos — UI. La eliminación (pura, sin re-comprimir) vive en lib.js.

import {
  isImageFile,
  baseNameNoExt,
  triggerDownload,
  formatBytes,
  stripMetadata,
  cleanedFileName,
} from "./lib.js";

(() => {
  "use strict";

  let fileBytes = null;
  let fileType = "";
  let base = "imagen";
  let originalSize = 0;
  let previewUrl = null;

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const previewImg = $("preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const cleanBtn = $("clean-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function extFor(type) {
    return /png/i.test(type) ? "png" : "jpg";
  }

  async function loadFile(file) {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatus("Eso no parece una imagen.", "error");
      return;
    }
    if (!/jpe?g|png/i.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
      setStatus("De momento solo JPG y PNG.", "error");
      return;
    }
    setStatus("Leyendo la imagen…");
    try {
      fileBytes = new Uint8Array(await file.arrayBuffer());
      fileType = file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg");
      base = baseNameNoExt(file.name);
      originalSize = file.size;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      previewImg.src = previewUrl;
      infoEl.textContent = `${extFor(fileType).toUpperCase()} · ${formatBytes(originalSize)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo leer la imagen.", "error");
    }
  }

  function clean() {
    if (!fileBytes) return;
    cleanBtn.disabled = true;
    try {
      const { bytes, removed } = stripMetadata(fileBytes, fileType);
      triggerDownload(
        new Blob([bytes], { type: fileType }),
        cleanedFileName(base, extFor(fileType))
      );
      setStatus(
        removed > 0
          ? `Metadatos eliminados (−${formatBytes(removed)}). Los píxeles no se han tocado.`
          : "Descargada. No se han encontrado metadatos que eliminar.",
        "ok"
      );
    } catch (err) {
      console.error(err);
      setStatus("No se pudo procesar la imagen.", "error");
    } finally {
      cleanBtn.disabled = false;
    }
  }

  function reset() {
    fileBytes = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
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
  cleanBtn.addEventListener("click", clean);
})();
