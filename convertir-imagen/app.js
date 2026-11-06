// Convertir imagen — UI. Una o varias imágenes; preview en vivo de la seleccionada,
// descarga individual, por separado o en ZIP. HEIC/HEIF se decodifica en un worker WASM.

import {
  isImageFile,
  isHeicFile,
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
  inputFormatLabel,
  uniqueFileNames,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";
import { msgs, fmt, plural } from "../lib/i18n.js";

(() => {
  "use strict";

  const M = msgs("convertir-imagen");

  let items = []; // { id, name, size, label, src: Blob, thumb, w, h, cache: { key, blob } }
  let nextId = 1;
  let selectedId = null;
  let bitmap = null; // decodificado de la imagen seleccionada
  let resultUrl = null;
  let recomputeTimer = null;
  let recomputeToken = 0;
  let selectToken = 0;
  let session = 0; // invalida lecturas en curso tras "Empezar de nuevo"
  let busy = false;

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const resultPreview = $("result-preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const estimateEl = $("estimate");
  const fileList = $("file-list");
  const formatSel = $("target-format");
  const qualityField = $("quality-field");
  const qualityInput = $("quality");
  const qualityVal = $("quality-val");
  const convertBtn = $("convert-btn");
  const zipBtn = $("zip-btn");
  const separateBtn = $("separate-btn");

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  const imagesWord = (n) => plural(n, M.images);
  const selected = () => items.find((it) => it.id === selectedId) || null;
  const settingsKey = () => `${formatSel.value}|${qualityInput.value}`;

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

  // ── HEIC: worker WASM bajo demanda, reutilizado entre archivos ──
  let heicWorker = null;
  let heicSeq = 0;
  const heicPending = new Map();

  function failHeicWorker() {
    heicPending.forEach((p) => p.reject(new Error("heic worker error")));
    heicPending.clear();
    heicWorker?.terminate();
    heicWorker = null;
  }

  function decodeHeic(file) {
    if (!heicWorker) {
      heicWorker = new Worker(new URL("./heic-worker.js", import.meta.url), { type: "module" });
      heicWorker.onmessage = ({ data }) => {
        const p = heicPending.get(data.id);
        if (!p) return;
        heicPending.delete(data.id);
        if (data.ok) p.resolve(data.blob);
        else p.reject(new Error(data.error));
      };
      heicWorker.onerror = failHeicWorker;
    }
    const id = ++heicSeq;
    return new Promise((resolve, reject) => {
      heicPending.set(id, { resolve, reject });
      heicWorker.postMessage({ id, file });
    });
  }

  // ── Lectura de archivos ──
  async function readItem(file) {
    const src = isHeicFile(file) ? await decodeHeic(file) : file;
    const bmp = await loadBitmap(src);
    const w = bmp.width;
    const h = bmp.height;
    bmp.close?.();
    return {
      id: nextId++,
      name: file.name,
      size: file.size,
      label: inputFormatLabel(file.name),
      src,
      thumb: URL.createObjectURL(src),
      w,
      h,
      cache: null,
    };
  }

  async function addFiles(fileLike) {
    const files = Array.from(fileLike || []);
    if (files.length === 0 || busy) return;
    const accepted = files.filter((f) => isHeicFile(f) || isImageFile(f));
    const rejected = files.filter((f) => !accepted.includes(f)).map((f) => f.name);
    const failed = [];
    const wasEmpty = items.length === 0;
    const mySession = session;

    if (accepted.length > 0) {
      setBusy(true);
      setStatus(fmt(M.reading, { n: accepted.length, images: imagesWord(accepted.length) }));
      for (const file of accepted) {
        try {
          const item = await readItem(file);
          if (mySession !== session) return;
          items.push(item);
        } catch (err) {
          if (mySession !== session) return;
          console.error(err);
          failed.push(file.name);
        }
      }
      setBusy(false);
    }

    if (wasEmpty && items.length > 0) {
      const first = accepted.find((f) => !failed.includes(f.name));
      formatSel.value = first && (isHeicFile(first) || first.type === "image/png") ? "image/jpeg" : "image/png";
      syncQualityVisibility();
    }

    const problems = [];
    if (rejected.length) problems.push(fmt(M.unsupported, { names: rejected.join(", ") }));
    if (failed.length) problems.push(fmt(M.readError, { names: failed.join(", ") }));
    setStatus(problems.join(" "), problems.length ? "error" : "");

    if (items.length === 0) return;
    refresh();
    if (!selected()) select(items[0].id);
  }

  // ── Render ──
  function refresh() {
    if (items.length === 0) {
      reset();
      return;
    }
    loader.classList.add("hidden");
    workspace.classList.remove("hidden");
    const multi = items.length > 1;
    fileList.classList.toggle("hidden", !multi);
    convertBtn.classList.toggle("hidden", multi);
    zipBtn.classList.toggle("hidden", !multi);
    separateBtn.classList.toggle("hidden", !multi);
    renderList();
  }

  function renderList() {
    if (items.length < 2) {
      fileList.replaceChildren();
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "file-row" + (it.id === selectedId ? " is-selected" : "");
      const name = escapeHtml(it.name);
      li.innerHTML = `
        <img class="thumb" src="${it.thumb}" alt="" />
        <div class="info" role="button" tabindex="0" aria-label="${escapeHtml(M.preview)} ${name}">
          <span class="fname">${name}</span>
          <span class="fmeta">${it.label} · ${it.w}×${it.h} · ${formatBytes(it.size)}</span>
        </div>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-act="download" aria-label="${escapeHtml(M.downloadOne)} ${name}" title="${escapeHtml(M.downloadOne)}">⬇</button>
          <button class="icon-btn" type="button" data-act="remove" aria-label="${escapeHtml(M.remove)} ${name}" title="${escapeHtml(M.remove)}">✕</button>
        </div>`;
      const info = li.querySelector(".info");
      info.addEventListener("click", () => select(it.id));
      info.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(it.id);
        }
      });
      li.querySelector('[data-act="download"]').addEventListener("click", () => downloadOne(it));
      li.querySelector('[data-act="remove"]').addEventListener("click", () => remove(it.id));
      frag.appendChild(li);
    });
    fileList.replaceChildren(frag);
  }

  async function select(id) {
    selectedId = id;
    renderList();
    const it = selected();
    if (!it) return;
    const token = ++selectToken;
    bitmap?.close?.();
    bitmap = null;
    resultPreview.src = it.thumb;
    infoEl.textContent = `${M.originalLabel} ${it.label} · ${it.w}×${it.h} · ${formatBytes(it.size)}`;
    try {
      const bmp = await loadBitmap(it.src);
      if (token !== selectToken) {
        bmp.close?.();
        return;
      }
      bitmap = bmp;
      recompute();
    } catch (err) {
      console.error(err);
      setStatus(fmt(M.readError, { names: it.name }), "error");
    }
  }

  // ── Conversión ──
  async function encode(bmp, w, h) {
    const mime = formatSel.value;
    const quality = isLossy(mime) ? Number(qualityInput.value) / 100 : undefined;
    return canvasToBlob(drawToCanvas(bmp, w, h), mime, quality);
  }

  async function convertItem(it) {
    const key = settingsKey();
    if (it.cache?.key === key) return it.cache.blob;
    const own = it.id === selectedId && bitmap;
    const bmp = own ? bitmap : await loadBitmap(it.src);
    try {
      const blob = await encode(bmp, it.w, it.h);
      it.cache = { key, blob };
      return blob;
    } finally {
      if (!own) bmp.close?.();
    }
  }

  async function recompute() {
    const it = selected();
    if (!it || !bitmap) return;
    const token = ++recomputeToken;
    estimateEl.textContent = M.calculating;
    try {
      const blob = await convertItem(it);
      if (token !== recomputeToken) return;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      resultPreview.src = resultUrl;
      const fmtLabel = extForMime(formatSel.value).toUpperCase();
      estimateEl.innerHTML = `${M.resultLabel} <b>≈ ${formatBytes(blob.size)}</b> · ${it.w}×${it.h} · ${fmtLabel}`;
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

  function outputNames() {
    const ext = extForMime(formatSel.value);
    return uniqueFileNames(items.map((it) => convertedFileName(baseNameNoExt(it.name), ext)));
  }

  function setBusy(on) {
    busy = on;
    [convertBtn, zipBtn, separateBtn, $("add-more-btn")].forEach((b) => (b.disabled = on));
    fileList.querySelectorAll("button").forEach((b) => (b.disabled = on));
  }

  async function downloadOne(it) {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await convertItem(it);
      const name = outputNames()[items.indexOf(it)];
      triggerDownload(blob, name);
      setStatus(fmt(M.downloadedOne, { name, size: formatBytes(blob.size) }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.convertError, "error");
    } finally {
      setBusy(false);
    }
  }

  async function downloadZip() {
    if (busy || items.length === 0) return;
    setBusy(true);
    const n = items.length;
    try {
      const names = outputNames();
      const zip = new JSZip();
      for (let i = 0; i < n; i++) {
        setStatus(fmt(M.converting, { i: i + 1, n }));
        zip.file(names[i], await convertItem(items[i]));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, fmt(M.zipName, { ext: extForMime(formatSel.value) }));
      setStatus(fmt(M.zipDownloaded, { n, images: imagesWord(n), size: formatBytes(blob.size) }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.zipError, "error");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSeparately() {
    if (busy || items.length === 0) return;
    const n = items.length;
    if (n > 5 && !window.confirm(fmt(M.confirmMany, { n }))) return;
    setBusy(true);
    try {
      const names = outputNames();
      for (let i = 0; i < n; i++) {
        setStatus(fmt(M.converting, { i: i + 1, n }));
        triggerDownload(await convertItem(items[i]), names[i]);
        // Margen entre descargas para que el navegador no las descarte.
        await new Promise((r) => setTimeout(r, 350));
      }
      setStatus(fmt(M.manyDownloaded, { n, images: imagesWord(n) }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(M.convertError, "error");
    } finally {
      setBusy(false);
    }
  }

  function remove(id) {
    if (busy) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    URL.revokeObjectURL(it.thumb);
    items = items.filter((x) => x.id !== id);
    setStatus("");
    if (items.length === 0) {
      reset();
      return;
    }
    refresh();
    if (selectedId === id) select(items[0].id);
  }

  function reset() {
    session += 1;
    setBusy(false);
    items.forEach((it) => URL.revokeObjectURL(it.thumb));
    items = [];
    selectedId = null;
    bitmap?.close?.();
    bitmap = null;
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    resultPreview.removeAttribute("src");
    fileList.replaceChildren();
    fileInput.value = "";
    workspace.classList.add("hidden");
    loader.classList.remove("hidden");
    estimateEl.textContent = "";
    setStatus("");
  }

  wireDropzone({ dropzone, input: fileInput, onFiles: addFiles, multiple: true });
  fileInput.addEventListener("change", () => (fileInput.value = ""));
  $("add-more-btn").addEventListener("click", () => fileInput.click());
  $("reset-btn").addEventListener("click", reset);
  formatSel.addEventListener("change", scheduleRecompute);
  qualityInput.addEventListener("input", scheduleRecompute);
  convertBtn.addEventListener("click", () => selected() && downloadOne(selected()));
  zipBtn.addEventListener("click", downloadZip);
  separateBtn.addEventListener("click", downloadSeparately);

  syncQualityVisibility();
})();
