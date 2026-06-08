// Separador de PDF — lógica 100% cliente con pdf-lib + JSZip.
// No se sube ningún archivo: todo ocurre en el navegador del usuario.
// La lógica pura/PDF vive en lib.js (testeable); aquí va el cableado del DOM.

import {
  sanitizeBaseName,
  formatBytes,
  pageFileName,
  zipFileName,
  isPdf,
  extractPage as extractPageLib,
} from "./lib.js";

(() => {
  "use strict";

  const { PDFDocument } = window.PDFLib;

  // --- Estado ---
  let srcBytes = null;     // ArrayBuffer del PDF original
  let pageCount = 0;       // número de páginas
  let baseName = "documento"; // nombre sin extensión, ya saneado

  // --- Referencias DOM ---
  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const loader = $("loader");
  const workspace = $("workspace");
  const fileNameEl = $("file-name");
  const fileMetaEl = $("file-meta");
  const pagesList = $("pages-list");
  const selectedCountEl = $("selected-count");
  const progress = $("progress");
  const progressBar = progress.querySelector("i");
  const statusEl = $("status");

  // Extrae una página del PDF cargado (inyecta PDFDocument y los bytes en memoria).
  const extractPage = (pageIndex) => extractPageLib(PDFDocument, srcBytes, pageIndex);

  // --- Utilidades de UI ---

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function showProgress(show) {
    progress.classList.toggle("show", show);
    progress.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) progressBar.style.width = "0%";
  }

  function setProgress(ratio) {
    progressBar.style.width = `${Math.round(ratio * 100)}%`;
  }

  function selectedPages() {
    return Array.from(pagesList.querySelectorAll("input:checked")).map((el) =>
      Number(el.value)
    );
  }

  function updateSelectedCount() {
    const n = selectedPages().length;
    selectedCountEl.textContent =
      n === 1 ? "1 seleccionada" : `${n} seleccionadas`;
    const noneSelected = n === 0;
    $("zip-btn").disabled = noneSelected;
    $("individual-btn").disabled = noneSelected;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Liberar el objeto URL tras un breve margen para que el navegador procese la descarga.
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // --- Carga del PDF ---

  async function loadFile(file) {
    if (!file) return;
    if (!isPdf(file)) {
      setStatus("Ese archivo no parece un PDF. Prueba con otro.", "error");
      return;
    }

    setStatus("Leyendo el PDF…");
    try {
      srcBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      pageCount = doc.getPageCount();

      if (pageCount === 0) {
        setStatus("El PDF no tiene páginas.", "error");
        return;
      }

      baseName = sanitizeBaseName(file.name);
      fileNameEl.textContent = file.name;
      fileMetaEl.textContent = `${pageCount} ${pageCount === 1 ? "página" : "páginas"} · ${formatBytes(file.size)}`;

      renderPages(pageCount);
      loader.classList.add("hidden");
      workspace.classList.remove("hidden");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(
        "No se pudo leer el PDF. Puede estar dañado o protegido con contraseña.",
        "error"
      );
    }
  }

  function renderPages(count) {
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= count; i++) {
      const li = document.createElement("li");
      li.className = "page-item";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `page-${i}`;
      input.value = String(i);
      input.checked = true;

      const label = document.createElement("label");
      label.setAttribute("for", `page-${i}`);
      label.innerHTML = `<span class="num">${i}</span><span class="tag">página</span>`;

      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "dl";
      dl.title = `Descargar solo la página ${i}`;
      dl.setAttribute("aria-label", `Descargar solo la página ${i}`);
      dl.textContent = "⬇";
      dl.addEventListener("click", (e) => {
        e.preventDefault();
        downloadSingle(i);
      });

      li.append(input, label, dl);
      frag.appendChild(li);
    }
    pagesList.replaceChildren(frag);
    pagesList.addEventListener("change", updateSelectedCount);
    updateSelectedCount();
  }

  // --- Acciones de descarga ---

  async function downloadSingle(pageNumber) {
    setStatus(`Preparando la página ${pageNumber}…`);
    try {
      const bytes = await extractPage(pageNumber - 1);
      triggerDownload(new Blob([bytes], { type: "application/pdf" }), pageFileName(baseName, pageNumber));
      setStatus(`Página ${pageNumber} descargada.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus(`No se pudo extraer la página ${pageNumber}.`, "error");
    }
  }

  async function downloadZip() {
    const pages = selectedPages();
    if (pages.length === 0) return;

    const zipBtn = $("zip-btn");
    zipBtn.disabled = true;
    showProgress(true);
    setStatus(`Generando ${pages.length} páginas…`);

    try {
      const zip = new JSZip();
      for (let i = 0; i < pages.length; i++) {
        const pageNumber = pages[i];
        const bytes = await extractPage(pageNumber - 1);
        zip.file(pageFileName(baseName, pageNumber), bytes);
        setProgress((i + 1) / pages.length);
      }
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        setProgress(meta.percent / 100);
      });
      triggerDownload(blob, zipFileName(baseName));
      setStatus(`ZIP con ${pages.length} páginas descargado.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo generar el ZIP.", "error");
    } finally {
      showProgress(false);
      zipBtn.disabled = false;
      updateSelectedCount();
    }
  }

  async function downloadIndividually() {
    const pages = selectedPages();
    if (pages.length === 0) return;

    if (
      pages.length > 5 &&
      !window.confirm(
        `Vas a descargar ${pages.length} archivos por separado. ` +
          `Tu navegador puede pedirte permiso para descargas múltiples. ¿Continuar?`
      )
    ) {
      return;
    }

    $("individual-btn").disabled = true;
    setStatus(`Descargando ${pages.length} páginas…`);
    try {
      for (let i = 0; i < pages.length; i++) {
        const pageNumber = pages[i];
        const bytes = await extractPage(pageNumber - 1);
        triggerDownload(new Blob([bytes], { type: "application/pdf" }), pageFileName(baseName, pageNumber));
        // Pequeño margen entre descargas para no saturar el navegador.
        await new Promise((r) => setTimeout(r, 350));
      }
      setStatus(`${pages.length} páginas descargadas.`, "ok");
    } catch (err) {
      console.error(err);
      setStatus("Hubo un problema durante las descargas.", "error");
    } finally {
      updateSelectedCount();
    }
  }

  function reset() {
    srcBytes = null;
    pageCount = 0;
    baseName = "documento";
    fileInput.value = "";
    pagesList.replaceChildren();
    workspace.classList.add("hidden");
    loader.classList.remove("hidden");
    showProgress(false);
    setStatus("");
  }

  function setAll(checked) {
    pagesList.querySelectorAll("input").forEach((el) => (el.checked = checked));
    updateSelectedCount();
  }

  // --- Eventos ---

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Evitar que el navegador abra el PDF si se suelta en cualquier parte de la
  // ventana (causa habitual de que el "drag & drop no funcione").
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) =>
    window.addEventListener(evt, (e) => e.preventDefault())
  );

  // Feedback visual al arrastrar sobre la zona.
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.add("dragover"))
  );
  ["dragleave", "dragend"].forEach((evt) =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove("dragover"))
  );

  // Soltar en cualquier punto de la ventana carga el PDF.
  window.addEventListener("drop", (e) => {
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });

  fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));

  $("reset-btn").addEventListener("click", reset);
  $("select-all").addEventListener("click", () => setAll(true));
  $("select-none").addEventListener("click", () => setAll(false));
  $("zip-btn").addEventListener("click", downloadZip);
  $("individual-btn").addEventListener("click", downloadIndividually);
})();
