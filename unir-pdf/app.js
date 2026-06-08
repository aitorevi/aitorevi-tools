// Unir PDF — combina varios PDFs en uno, 100% en el navegador.
// La lógica vive en lib.js (testeable); aquí va el cableado del DOM.

import {
  sanitizeBaseName,
  formatBytes,
  isPdf,
  triggerDownload,
  mergePdfs,
  mergedFileName,
} from "./lib.js";

(() => {
  "use strict";

  const { PDFDocument } = window.PDFLib;

  // --- Estado ---
  let items = []; // { id, name, size, bytes, pages }
  let nextId = 1;

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const fileList = $("file-list");
  const countEl = $("count");
  const statusEl = $("status");
  const mergeBtn = $("merge-btn");

  // --- Utilidades ---
  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function totalPages() {
    return items.reduce((n, it) => n + it.pages, 0);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
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
    const p = totalPages();
    countEl.textContent = `${n} ${n === 1 ? "archivo" : "archivos"} · ${p} ${p === 1 ? "página" : "páginas"}`;
    mergeBtn.disabled = n < 2;
    renderList();
  }

  function renderList() {
    const frag = document.createDocumentFragment();
    items.forEach((it, idx) => {
      const li = document.createElement("li");
      li.className = "file-row";
      li.innerHTML = `
        <span class="order">${idx + 1}</span>
        <div class="info">
          <span class="fname">${escapeHtml(it.name)}</span>
          <span class="fmeta">${it.pages} ${it.pages === 1 ? "página" : "páginas"} · ${formatBytes(it.size)}</span>
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
    items = items.filter((it) => it.id !== id);
    setStatus("");
    refresh();
  }

  function clearAll() {
    items = [];
    setStatus("");
    refresh();
  }

  // --- Carga de ficheros ---
  async function addFiles(fileLike) {
    const files = Array.from(fileLike || []).filter(isPdf);
    if (files.length === 0) {
      setStatus("Eso no parece un PDF. Añade archivos PDF.", "error");
      return;
    }
    setStatus(`Leyendo ${files.length} ${files.length === 1 ? "archivo" : "archivos"}…`);
    let added = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        items.push({ id: nextId++, name: file.name, size: file.size, bytes, pages: doc.getPageCount() });
        added++;
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
    refresh();
    if (failed) {
      setStatus(`${added} añadido(s); ${failed} no se pudieron leer (¿dañados o protegidos?).`, "error");
    } else {
      setStatus(items.length < 2 ? "Añade al menos otro PDF para unir." : "");
    }
  }

  // --- Unir ---
  async function merge() {
    if (items.length < 2) return;
    mergeBtn.disabled = true;
    setStatus("Uniendo los PDFs…");
    try {
      const bytes = await mergePdfs(PDFDocument, items.map((it) => it.bytes));
      const base = sanitizeBaseName(items[0].name);
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), mergedFileName(base));
      setStatus(`PDF unido con ${totalPages()} páginas descargado.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo unir los PDFs.", "error");
    } finally {
      mergeBtn.disabled = items.length < 2;
    }
  }

  // --- Eventos ---
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Evitar que el navegador abra el PDF al soltarlo en cualquier parte.
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
  mergeBtn.addEventListener("click", merge);
})();
