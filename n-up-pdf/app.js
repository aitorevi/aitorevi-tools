// n-up PDF — UI. Combina uno o varios PDFs y coloca varias páginas por hoja.
// La lógica vive en lib.js (testeable); aquí va el cableado del DOM.

import {
  sanitizeBaseName,
  formatBytes,
  isPdf,
  triggerDownload,
  nUpPdf,
  nUpGrid,
  nUpFileName,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";
import { msgs, fmt, plural } from "../lib/i18n.js";

(() => {
  "use strict";

  const { PDFDocument } = window.PDFLib;
  const M = msgs("n-up-pdf");

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
  const applyBtn = $("apply-btn");
  const perInput = $("nup-per");
  const orientInput = $("nup-orient");
  const diagram = $("nup-diagram");

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
    countEl.textContent = `${n} ${plural(n, M.files)} · ${p} ${plural(p, M.pages)}`;
    applyBtn.disabled = n < 1;
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
          <span class="fmeta">${it.pages} ${plural(it.pages, M.pages)} · ${formatBytes(it.size)}</span>
        </div>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-act="up" ${idx === 0 ? "disabled" : ""} aria-label="${M.moveUp} ${escapeHtml(it.name)}" title="${M.moveUp}">▲</button>
          <button class="icon-btn" type="button" data-act="down" ${idx === items.length - 1 ? "disabled" : ""} aria-label="${M.moveDown} ${escapeHtml(it.name)}" title="${M.moveDown}">▼</button>
          <button class="icon-btn" type="button" data-act="remove" aria-label="${M.remove} ${escapeHtml(it.name)}" title="${M.remove}">✕</button>
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
      setStatus(M.notPdf, "error");
      return;
    }
    setStatus(fmt(M.reading, { n: files.length, files: plural(files.length, M.files) }));
    let failed = 0;
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        items.push({ id: nextId++, name: file.name, size: file.size, bytes, pages: doc.getPageCount() });
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
    refresh();
    setStatus(failed ? fmt(M.failedRead, { failed }) : "");
  }

  // --- Generar n-up ---
  async function apply() {
    if (items.length === 0) return;
    const perSheet = Number(perInput.value);
    applyBtn.disabled = true;
    setStatus(M.arranging);
    try {
      const bytes = await nUpPdf(window.PDFLib, items.map((it) => it.bytes), {
        perSheet,
        landscape: orientInput.value === "landscape",
      });
      const base = sanitizeBaseName(items[0].name) || "documento";
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), nUpFileName(base, perSheet));
      const sheets = Math.ceil(totalPages() / perSheet);
      setStatus(fmt(M.arrangedOk, { per: perSheet, sheets, sheetsWord: plural(sheets, M.sheets) }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.arrangeError, "error");
    } finally {
      applyBtn.disabled = items.length < 1;
    }
  }

  // --- Dibujo de cómo se reparte cada hoja (misma rejilla que el motor) ---
  function renderDiagram() {
    const landscape = orientInput.value === "landscape";
    const per = Number(perInput.value);
    const [cols, rows] = nUpGrid(per, landscape);
    diagram.style.aspectRatio = landscape ? "297 / 210" : "210 / 297";
    diagram.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    diagram.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= per; i++) {
      const cell = document.createElement("span");
      cell.textContent = i;
      frag.appendChild(cell);
    }
    diagram.replaceChildren(frag);
  }

  // --- Eventos ---
  wireDropzone({ dropzone, input: fileInput, multiple: true, onFiles: addFiles });
  $("add-more-btn").addEventListener("click", () => fileInput.click());
  $("clear-btn").addEventListener("click", clearAll);
  applyBtn.addEventListener("click", apply);
  perInput.addEventListener("change", renderDiagram);
  orientInput.addEventListener("change", renderDiagram);
  renderDiagram();
})();
