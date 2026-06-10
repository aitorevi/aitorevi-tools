// Comprimir imagen — UI. Datos/helpers en lib.js; Canvas aquí.
// Muestra el resultado estimado (px · calidad · KB) en vivo antes de descargar.

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
  searchQualityForTarget,
} from "./lib.js";
import { wireDropzone } from "../lib/dropzone.js";
import { msgs } from "../lib/i18n.js";

(() => {
  "use strict";

  const M = msgs("comprimir-imagen");
  let bitmap = null;
  let base = "imagen";
  let original = null; // { name, size, w, h, url }
  let currentResult = null; // { blob, w, h, quality }
  let recomputeTimer = null;
  let recomputeToken = 0;
  let resultUrl = null; // object URL de la preview del resultado

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const resultPreview = $("result-preview");
  const infoEl = $("file-info");
  const statusEl = $("status");
  const estimateEl = $("estimate");
  const formatSel = $("format");
  const maxSel = $("max-side");
  const qualityInput = $("quality");
  const qualityVal = $("quality-val");
  const targetInput = $("target-kb");
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

  function syncControls() {
    qualityVal.textContent = `${qualityInput.value}%`;
    const auto = Number(targetInput.value) > 0;
    qualityInput.disabled = auto;
    qualityInput.closest(".field").style.opacity = auto ? "0.45" : "1";
  }

  const encodedSize = (canvas, mime, q) => canvasToBlob(canvas, mime, q).then((b) => b.size);

  // Modo objetivo: mayor resolución que pueda caer bajo el objetivo y, a esa
  // resolución, la mejor calidad posible.
  async function compressToTarget(mime, targetBytes) {
    const startSide = Number(maxSel.value) || Math.min(Math.max(original.w, original.h), 2560);
    let chosen = null;
    for (let side = startSide; side >= 320; side = Math.round(side * 0.75)) {
      const { w, h } = fitDimensions(original.w, original.h, side);
      const canvas = drawToCanvas(bitmap, w, h);
      chosen = { canvas, w, h };
      if ((await encodedSize(canvas, mime, 0.1)) <= targetBytes) break;
    }
    const { canvas, w, h } = chosen;
    const best = await searchQualityForTarget((q) => encodedSize(canvas, mime, q), targetBytes);
    const quality = best ? best.quality : 0.1;
    const blob = await canvasToBlob(canvas, mime, quality);
    return { blob, w, h, quality };
  }

  async function computeResult() {
    const mime = formatSel.value;
    const targetBytes = Number(targetInput.value) > 0 ? Number(targetInput.value) * 1024 : 0;
    if (targetBytes > 0) return compressToTarget(mime, targetBytes);
    const { w, h } = fitDimensions(original.w, original.h, Number(maxSel.value));
    const quality = Number(qualityInput.value) / 100;
    const blob = await canvasToBlob(drawToCanvas(bitmap, w, h), mime, quality);
    return { blob, w, h, quality };
  }

  function describe(r) {
    const pct = reductionPercent(original.size, r.blob.size);
    const red = r.blob.size < original.size ? ` (−${pct}%)` : "";
    return `${r.w}×${r.h} · ${M.qualityWord} ${Math.round(r.quality * 100)}% · ${formatBytes(r.blob.size)}${red}`;
  }

  // Recalcula el resultado estimado (en vivo), descartando cálculos obsoletos.
  async function recompute() {
    if (!bitmap) return;
    const token = ++recomputeToken;
    estimateEl.textContent = M.calculating;
    estimateEl.classList.remove("over");
    try {
      const r = await computeResult();
      if (token !== recomputeToken) return; // llegó otro cálculo más nuevo
      currentResult = r;
      // Actualiza la preview con el resultado real (se ve la calidad).
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(r.blob);
      resultPreview.src = resultUrl;
      const targetBytes = Number(targetInput.value) > 0 ? Number(targetInput.value) * 1024 : 0;
      const over = targetBytes > 0 && r.blob.size > targetBytes;
      estimateEl.innerHTML = `${M.resultLabel} <b>≈ ${formatBytes(r.blob.size)}</b> · ${r.w}×${r.h} · ${M.qualityWord} ${Math.round(r.quality * 100)}%`;
      estimateEl.classList.toggle("over", over);
      if (over) estimateEl.innerHTML += M.overNote;
    } catch (err) {
      if (token === recomputeToken) estimateEl.textContent = "";
      console.error(err);
    }
  }

  function scheduleRecompute() {
    syncControls();
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recompute, 250);
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
      original = { name: file.name, size: file.size, w: bitmap.width, h: bitmap.height, url: URL.createObjectURL(file) };
      resultPreview.src = original.url; // placeholder hasta el primer cálculo
      infoEl.textContent = `${M.originalLabel} ${original.w}×${original.h} · ${formatBytes(original.size)}`;
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
      recompute();
    } catch (err) {
      console.error(err);
      setStatus(M.readError, "error");
    }
  }

  async function download() {
    if (!bitmap) return;
    compressBtn.disabled = true;
    try {
      const r = currentResult || (await computeResult());
      triggerDownload(r.blob, compressedFileName(base, extForMime(formatSel.value)));
      setStatus(`${M.downloadedLabel} ${describe(r)}.`, r.blob.size < original.size ? "ok" : "");
    } catch (err) {
      console.error(err);
      setStatus(M.compressError, "error");
    } finally {
      compressBtn.disabled = false;
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
  maxSel.addEventListener("change", scheduleRecompute);
  qualityInput.addEventListener("input", scheduleRecompute);
  targetInput.addEventListener("input", scheduleRecompute);
  compressBtn.addEventListener("click", download);

  syncControls();
})();
