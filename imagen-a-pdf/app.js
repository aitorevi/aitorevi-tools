// Imagen a PDF — UI. La lógica vive en lib.js (testeable); aquí, el DOM.

import {
  sanitizeBaseName,
  formatBytes,
  triggerDownload,
  isSupportedImage,
  imagesToPdf,
  outputFileName,
} from "./lib.js";

(() => {
  "use strict";

  const { PDFDocument } = window.PDFLib;

  // { id, name, size, type, bytes, w, h, thumb }
  let items = [];
  let nextId = 1;

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const fileList = $("file-list");
  const countEl = $("count");
  const statusEl = $("status");
  const createBtn = $("create-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  /** Lee dimensiones de una imagen desde un object URL. */
  function readDimensions(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = url;
    });
  }

  function refresh() {
    if (items.length === 0) {
      workspace.classList.add("hidden");
      loader.classList.remove("hidden");
      fileInput.value = "";
      return;
    }
    loader.classList.add("hidden");
    workspace.classList.remove("hidden");
    const n = items.length;
    countEl.textContent = `${n} ${n === 1 ? "imagen" : "imágenes"}`;
    createBtn.disabled = n < 1;
    renderList();
  }

  function renderList() {
    const frag = document.createDocumentFragment();
    items.forEach((it, idx) => {
      const li = document.createElement("li");
      li.className = "file-row";
      li.innerHTML = `
        <span class="order">${idx + 1}</span>
        <img class="thumb" src="${it.thumb}" alt="" />
        <div class="info">
          <span class="fname">${escapeHtml(it.name)}</span>
          <span class="fmeta">${it.w}×${it.h} · ${formatBytes(it.size)}</span>
        </div>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-act="up" ${idx === 0 ? "disabled" : ""} aria-label="Subir ${escapeHtml(it.name)}" title="Subir">▲</button>
          <button class="icon-btn" type="button" data-act="down" ${idx === items.length - 1 ? "disabled" : ""} aria-label="Bajar ${escapeHtml(it.name)}" title="Bajar">▼</button>
          <button class="icon-btn" type="button" data-act="remove" aria-label="Quitar ${escapeHtml(it.name)}" title="Quitar">✕</button>
        </div>`;
      li.querySelector('[data-act="up"]').addEventListener("click", () => move(idx, -1));
      li.querySelector('[data-act="down"]').addEventListener("click", () => move(idx, 1));
      li.querySelector('[data-act="remove"]').addEventListener("click", () => remove(it.id));
      frag.appendChild(li);
    });
    fileList.replaceChildren(frag);
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    refresh();
  }

  function remove(id) {
    const it = items.find((x) => x.id === id);
    if (it) URL.revokeObjectURL(it.thumb);
    items = items.filter((x) => x.id !== id);
    setStatus("");
    refresh();
  }

  function clearAll() {
    items.forEach((it) => URL.revokeObjectURL(it.thumb));
    items = [];
    setStatus("");
    refresh();
  }

  async function addFiles(fileLike) {
    const files = Array.from(fileLike || []).filter(isSupportedImage);
    if (files.length === 0) {
      setStatus("Añade imágenes JPG o PNG.", "error");
      return;
    }
    setStatus(`Leyendo ${files.length} ${files.length === 1 ? "imagen" : "imágenes"}…`);
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const thumb = URL.createObjectURL(file);
      const { w, h } = await readDimensions(thumb);
      items.push({
        id: nextId++,
        name: file.name,
        size: file.size,
        type: file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg"),
        bytes,
        w,
        h,
        thumb,
      });
    }
    refresh();
    setStatus("");
  }

  async function createPdf() {
    if (items.length === 0) return;
    createBtn.disabled = true;
    setStatus("Creando el PDF…");
    try {
      const bytes = await imagesToPdf(PDFDocument, items.map((i) => ({ bytes: i.bytes, type: i.type })));
      const base = sanitizeBaseName(items[0].name) || "imagenes";
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), outputFileName(base));
      setStatus(`PDF con ${items.length} ${items.length === 1 ? "imagen" : "imágenes"} descargado.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo crear el PDF.", "error");
    } finally {
      createBtn.disabled = items.length < 1;
    }
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
    addFiles(e.dataTransfer?.files);
  });
  fileInput.addEventListener("change", (e) => addFiles(e.target.files));
  $("add-more-btn").addEventListener("click", () => fileInput.click());
  $("clear-btn").addEventListener("click", clearAll);
  createBtn.addEventListener("click", createPdf);
})();
