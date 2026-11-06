// Helper compartido de los validadores: monta el editor con numeración de líneas,
// el panel de resultado y los botones, y recibe la lógica pura de cada formato.
// Un validador es `(texto) => { valid, errors, meta }` (ver lib/validators/result.js).
// Opcionalmente ofrece un modo "schema": un segundo editor y una lista de errores,
// cada uno con salto a su posición. Sin red ni dependencias externas: solo DOM + los
// textos i18n de runtime.
import { fmt, msgs, plural } from "./i18n.js";
import { buildCodeFrame } from "./validators/frame.js";

/** A partir de este tamaño (caracteres) la validación automática se desactiva. */
export const AUTO_LIMIT = 1_000_000;
/** Máximo de errores que se pintan en la lista del modo schema. */
export const MAX_LIST = 100;

const ICONS = { idle: "–", valid: "✓", invalid: "✕" };
let uid = 0;

const paneHtml = (inputRole, label, placeholder, statusId) => `
  <div class="code-pane" data-pane="${inputRole}">
    <div class="code-bar">
      <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="code-bar-label" data-role="${inputRole}-label">${label}</span>
    </div>
    <div class="validate-editor">
      <div class="validate-gutter" aria-hidden="true">1</div>
      <textarea class="code-area validate-input" data-role="${inputRole}" spellcheck="false"
                autocapitalize="off" autocomplete="off" autocorrect="off"
                placeholder="${placeholder}" aria-label="${label}"
                aria-describedby="${statusId}"></textarea>
      <div class="validate-mark" aria-hidden="true" hidden></div>
      <div class="validate-caret" aria-hidden="true" hidden></div>
      <span class="validate-measure" aria-hidden="true"></span>
    </div>
  </div>`;

/** Editor con numeración de líneas y marcas de la línea y la columna del error. */
function makeEditor(pane, inputRole) {
  const q = (sel) => pane.querySelector(sel);
  const input = q(`[data-role="${inputRole}"]`);
  const gutter = q(".validate-gutter");
  const editorEl = q(".validate-editor");
  const mark = q(".validate-mark");
  const caret = q(".validate-caret");
  const measure = q(".validate-measure");
  const ed = { pane, input, current: null };
  let gutterLines = 0;

  ed.syncGutter = () => {
    const lines = input.value.split("\n").length;
    if (lines !== gutterLines) {
      gutterLines = lines;
      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    }
    gutter.scrollTop = input.scrollTop;
  };

  ed.lineHeight = () => parseFloat(getComputedStyle(input).lineHeight) || 20;

  /** Pinta la banda de la línea y la marca de la columna del error. */
  ed.placeMarks = () => {
    const cur = ed.current;
    if (!cur || cur.line == null) { mark.hidden = true; caret.hidden = true; return; }
    const cs = getComputedStyle(input);
    const lh = ed.lineHeight();
    mark.style.height = `${lh}px`;
    mark.style.top = `${parseFloat(cs.paddingTop) + (cur.line - 1) * lh - input.scrollTop}px`;
    mark.hidden = false;

    const lineText = input.value.split("\n")[cur.line - 1] || "";
    measure.textContent = lineText.slice(0, Math.max(0, cur.column - 1));
    const x = measure.getBoundingClientRect().width;
    measure.textContent = lineText.charAt(cur.column - 1) || "0";
    const w = measure.getBoundingClientRect().width;
    const left = gutter.offsetWidth + parseFloat(cs.paddingLeft) + x - input.scrollLeft;
    caret.style.height = `${lh}px`;
    caret.style.top = mark.style.top;
    caret.style.left = `${left}px`;
    caret.style.width = `${Math.max(w, 2)}px`;
    caret.hidden = left < gutter.offsetWidth || left > editorEl.clientWidth;
  };

  ed.setMark = (loc) => { ed.current = loc; ed.placeMarks(); };
  ed.clearMarks = () => { ed.current = null; mark.hidden = true; caret.hidden = true; };

  /** Pone el cursor en `offset` y centra la línea; la marca pasa a esa posición. */
  ed.jumpTo = (loc) => {
    input.focus();
    input.setSelectionRange(loc.offset, Math.min(loc.offset + 1, input.value.length));
    // Centra la línea en vertical (el foco solo garantiza que el cursor sea visible).
    input.scrollTop = Math.max(0, (loc.line - 1) * ed.lineHeight() - input.clientHeight / 2);
    ed.syncGutter();
    ed.setMark(loc);
  };

  input.addEventListener("scroll", () => { gutter.scrollTop = input.scrollTop; ed.placeMarks(); });
  window.addEventListener("resize", ed.placeMarks);
  return ed;
}

/**
 * @param {Object} opts
 * @param {string|HTMLElement} opts.mount
 * @param {string} opts.toolId                  id de la tool (textos i18n)
 * @param {(text: string) => Object} opts.validate
 * @param {(meta: Object, M: Object) => Array<[string, string]>} [opts.metaItems]
 *        pares [etiqueta, valor] que se muestran cuando el texto es válido
 * @param {(meta: Object, M: Object) => string[]} [opts.noteItems]
 *        avisos que se muestran junto a "válido" (p. ej. un token caducado)
 * @param {(text: string) => string} [opts.format]   embellece (puede lanzar)
 * @param {(text: string) => string} [opts.minify]   minifica (puede lanzar)
 * @param {string} [opts.sample]                ejemplo para el botón "Probar ejemplo"
 * @param {Object} [opts.schemaMode]            modo "validar contra un schema":
 *        { check(documentText, schemaText) → Promise<resultado>, metaItems(meta, M),
 *          sample: { document, schema } }. Sus textos van en msgs(toolId).
 * @param {number} [opts.debounceMs=300]
 * @param {number} [opts.autoLimit=AUTO_LIMIT]
 */
export function mountValidateTool({
  mount, toolId, validate, metaItems, noteItems, format, minify, sample, schemaMode,
  debounceMs = 300, autoLimit = AUTO_LIMIT,
}) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;
  if (!root || typeof validate !== "function") return;

  const M = msgs(toolId);
  const id = `validate-${++uid}`;
  const hints = M.hints || {};

  root.innerHTML = `
    <div class="code-tool validate-tool">
      ${schemaMode ? `
      <div class="validate-modebar">
        <label class="validate-switch">
          <input type="checkbox" role="switch" data-role="mode">
          <span class="validate-switch-track" aria-hidden="true"></span>
          <span class="validate-switch-label">${M.schemaToggle}</span>
        </label>
      </div>` : ""}
      <div class="code-io" data-role="io">
        ${paneHtml("input", M.codeInput, M.valPlaceholder, `${id}-status`)}
        <div class="code-pane code-pane-out" data-role="result-pane">
          <div class="code-bar">
            <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="code-bar-label">${M.codeOutput}</span>
          </div>
          <div class="validate-result">
            <div class="validate-status is-idle" id="${id}-status" data-role="status"
                 role="status" aria-live="polite" aria-atomic="true">
              <span class="validate-icon" data-role="icon" aria-hidden="true"></span>
              <div class="validate-text">
                <p class="validate-headline" data-role="headline"></p>
                <p class="validate-detail" data-role="detail"></p>
                <p class="validate-tech" data-role="tech"></p>
              </div>
            </div>
            <pre class="validate-frame" data-role="frame" aria-hidden="true" hidden></pre>
            <button class="btn validate-jump" type="button" data-act="jump" hidden></button>
            <ol class="validate-errors" data-role="errors" hidden></ol>
            <p class="validate-more" data-role="more" hidden></p>
            <dl class="validate-meta" data-role="meta" hidden></dl>
          </div>
        </div>
      </div>
      <p class="code-alert code-alert--warn" data-role="warn" role="status"></p>
      <div class="actions">
        <button class="btn primary" type="button" data-act="validate" disabled>${M.valValidate}</button>
        ${typeof format === "function" ? `<button class="btn" type="button" data-act="format" disabled>${M.codeFormat}</button>` : ""}
        ${typeof minify === "function" ? `<button class="btn" type="button" data-act="minify" disabled>${M.codeMinify}</button>` : ""}
        ${sample ? `<button class="btn" type="button" data-act="sample">${M.codeSample}</button>` : ""}
        <button class="btn" type="button" data-act="clear" disabled>${M.clear}</button>
      </div>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const toolEl = $(".validate-tool");
  const ioEl = $('[data-role="io"]');
  const status = $('[data-role="status"]');
  const icon = $('[data-role="icon"]');
  const headline = $('[data-role="headline"]');
  const detail = $('[data-role="detail"]');
  const tech = $('[data-role="tech"]');
  const frameEl = $('[data-role="frame"]');
  const errorsEl = $('[data-role="errors"]');
  const moreEl = $('[data-role="more"]');
  const metaEl = $('[data-role="meta"]');
  const warnEl = $('[data-role="warn"]');
  const jumpBtn = $('[data-act="jump"]');
  const btn = (act) => $(`[data-act="${act}"]`);
  const validateBtn = btn("validate");
  const formatBtn = btn("format");
  const minifyBtn = btn("minify");
  const clearBtn = btn("clear");
  const modeToggle = $('[data-role="mode"]');

  const doc = makeEditor($('[data-pane="input"]'), "input");
  let schemaEd = null; // se crea al activar el modo schema
  let mode = "single";
  let timer = null;
  let runToken = 0;

  const editors = () => (schemaEd ? [doc, schemaEd] : [doc]);
  const activeEditors = () => (mode === "schema" ? editors() : [doc]);
  const hasText = () => activeEditors().some((e) => e.input.value.trim() !== "");
  const totalLength = () => activeEditors().reduce((n, e) => n + e.input.value.length, 0);

  // --- panel de resultado ---------------------------------------------------

  const setStatus = (kind, headlineText, detailText = "", techText = "") => {
    status.className = `validate-status is-${kind}`;
    icon.textContent = ICONS[kind];
    headline.textContent = headlineText;
    detail.textContent = detailText;
    tech.textContent = techText;
    detail.hidden = !detailText;
    tech.hidden = !techText;
  };

  const setInvalidFlags = (docInvalid, schemaInvalid = false) => {
    doc.input.setAttribute("aria-invalid", String(docInvalid));
    if (schemaEd) schemaEd.input.setAttribute("aria-invalid", String(schemaInvalid));
  };

  const resetDetails = () => {
    editors().forEach((e) => e.clearMarks());
    frameEl.hidden = true;
    jumpBtn.hidden = true;
    errorsEl.hidden = true;
    errorsEl.replaceChildren();
    moreEl.hidden = true;
    metaEl.hidden = true;
    metaEl.replaceChildren();
  };

  /** `canTransform`: Formatear/Minificar solo con un documento válido. */
  const syncButtons = (canTransform) => {
    validateBtn.disabled = !hasText();
    clearBtn.disabled = editors().every((e) => e.input.value.trim() === "");
    if (formatBtn) formatBtn.disabled = !canTransform;
    if (minifyBtn) minifyBtn.disabled = !canTransform;
  };

  const showIdle = (text = mode === "schema" ? M.schemaIdle : M.valIdle) => {
    resetDetails();
    setStatus("idle", text);
    setInvalidFlags(false);
    syncButtons(false);
  };

  const renderMeta = (items) => {
    for (const [label, value] of items) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      metaEl.append(dt, dd);
    }
    metaEl.hidden = items.length === 0;
  };

  const showValid = (result, note) => {
    resetDetails();
    const meta = result.meta || {};
    const notes = [note, ...(noteItems ? noteItems(meta, M) : []), meta.hadBom ? M.valBom : ""].filter(Boolean);
    setStatus("valid", M.valid, notes.join(" "));
    setInvalidFlags(false);
    renderMeta(metaItems ? metaItems(result.meta || {}, M) : []);
    syncButtons(true);
  };

  const showInvalid = (result, text) => {
    resetDetails();
    const err = result.errors[0];
    const located = err.line != null && err.column != null;
    const where = located ? fmt(M.valAt, { line: err.line, column: err.column }) : M.valNoPosition;
    const hintText = err.hint && hints[err.hint] ? fmt(hints[err.hint], err.params || {}) : "";
    setStatus("invalid", M.invalid, [where + ".", hintText].filter(Boolean).join(" "), `${M.valTechnical}: ${err.message}`);
    setInvalidFlags(true);
    if (located) {
      const frame = buildCodeFrame(text, err.line, err.column);
      frameEl.textContent = frame;
      frameEl.hidden = !frame;
      doc.setMark({ line: err.line, column: err.column, offset: err.offset });
      jumpBtn.textContent = fmt(M.valJump, { line: err.line, column: err.column });
      jumpBtn.hidden = err.offset == null;
    }
    syncButtons(false);
  };

  // --- modo schema: lista de errores ----------------------------------------

  const editorFor = (error) => (error.source === "schema" ? schemaEd : doc);

  const errorText = (error) => {
    const tpl = error.hint && hints[error.hint];
    return tpl ? fmt(tpl, error.params || {}) : error.message;
  };

  const errorItem = (error) => {
    const li = document.createElement("li");
    li.className = `validate-error is-${error.source === "schema" ? "schema" : "document"}`;
    const head = document.createElement("div");
    head.className = "validate-error-head";
    if (error.source) { // los errores internos no tienen origen: no se etiquetan
      const src = document.createElement("span");
      src.className = "validate-error-src";
      src.textContent = error.source === "schema" ? M.srcSchema : M.srcDocument;
      head.append(src);
    }
    if (error.path !== undefined) {
      const path = document.createElement("code");
      path.className = "validate-error-path";
      path.textContent = error.path === "" ? M.pathRoot : error.path;
      head.append(path);
    }
    if (error.line != null && error.column != null) {
      const pos = document.createElement("span");
      pos.className = "validate-error-pos";
      pos.textContent = fmt(M.valAt, { line: error.line, column: error.column });
      head.append(pos);
    }
    const msg = document.createElement("p");
    msg.className = "validate-error-msg";
    msg.textContent = errorText(error);
    li.append(head, msg);
    if (error.hint && hints[error.hint] && error.message) {
      const t = document.createElement("p");
      t.className = "validate-tech";
      t.textContent = `${M.valTechnical}: ${error.message}`;
      li.append(t);
    }
    const ed = editorFor(error);
    if (ed && error.offset != null) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn validate-error-jump";
      b.dataset.act = "jump-item";
      b.textContent = M.itemJump;
      b.setAttribute("aria-label", fmt(M.itemJumpAria, { path: error.path === "" || error.path === undefined ? M.pathRoot : error.path, source: error.source === "schema" ? M.srcSchema : M.srcDocument }));
      b.addEventListener("click", () => ed.jumpTo({ line: error.line, column: error.column, offset: error.offset }));
      li.append(b);
    }
    return li;
  };

  const showSchemaResult = (result) => {
    const stage = (result.meta && result.meta.stage) || "validation";
    if (stage === "cancelled") return;
    if (stage === "empty") return showIdle();
    resetDetails();
    if (result.valid) {
      setStatus("valid", M.stage.valid);
      setInvalidFlags(false);
      renderMeta(schemaMode.metaItems ? schemaMode.metaItems(result.meta || {}, M) : []);
      return syncButtons(true);
    }
    const n = result.errors.length;
    const label = fmt(M.stage[stage] || M.stage.validation, { n, errors: plural(n, M.errorUnit) });
    setStatus("invalid", label);
    for (const error of result.errors.slice(0, MAX_LIST)) errorsEl.append(errorItem(error));
    errorsEl.hidden = n === 0;
    if (n > MAX_LIST) {
      moreEl.textContent = fmt(M.moreErrors, { n: n - MAX_LIST, shown: MAX_LIST });
      moreEl.hidden = false;
    }
    // Cada editor marca su primer error con posición.
    for (const ed of editors()) {
      const first = result.errors.find((e) => editorFor(e) === ed && e.offset != null);
      if (first) ed.setMark({ line: first.line, column: first.column, offset: first.offset });
    }
    setInvalidFlags(result.errors.some((e) => e.source !== "schema"), result.errors.some((e) => e.source === "schema"));
    // Formatear/Minificar necesitan un documento con sintaxis correcta.
    const docBroken = ["syntax", "missing"].includes(stage) && result.errors.some((e) => e.source !== "schema");
    syncButtons(!docBroken && doc.input.value.trim() !== "");
  };

  // --- ejecución -------------------------------------------------------------

  const internalError = (e) => ({
    valid: false,
    errors: [{ message: (e && e.message) || String(e), line: null, column: null, offset: null, hint: null }],
  });

  /** Valida el contenido actual y pinta el resultado. */
  const run = async (note = "") => {
    clearTimeout(timer);
    const my = ++runToken;
    if (mode === "schema") {
      if (!hasText()) return showIdle();
      let result;
      try {
        result = await schemaMode.check(doc.input.value, schemaEd.input.value);
      } catch (e) {
        result = { ...internalError(e), meta: { stage: "syntax" } };
      }
      if (my !== runToken) return; // llegó otra validación después
      return showSchemaResult(result);
    }
    const text = doc.input.value;
    if (text.trim() === "") return showIdle();
    let result;
    try {
      result = validate(text);
    } catch (e) {
      return showInvalid(internalError(e), text);
    }
    if (result.valid) return showValid(result, note);
    if (result.errors[0].hint === "empty") return showIdle();
    return showInvalid(result, text);
  };

  const isLarge = () => totalLength() > autoLimit;
  const syncWarn = () => {
    warnEl.textContent = isLarge() ? fmt(M.valLarge, { size: (totalLength() / 1_000_000).toFixed(1) }) : "";
  };

  const onInput = () => {
    clearTimeout(timer);
    runToken++; // una validación en vuelo ya no vale
    editors().forEach((e) => { e.syncGutter(); e.clearMarks(); });
    syncWarn();
    if (formatBtn) formatBtn.disabled = true;
    if (minifyBtn) minifyBtn.disabled = true;
    validateBtn.disabled = !hasText();
    clearBtn.disabled = editors().every((e) => e.input.value.trim() === "");
    if (!hasText()) return showIdle();
    if (isLarge()) return showIdle(M.valPending);
    timer = setTimeout(() => run(), debounceMs);
  };

  /** Sustituye el contenido conservando el historial de deshacer si el navegador lo permite. */
  const replaceText = (text) => {
    doc.input.focus();
    doc.input.select();
    let done = false;
    try { done = document.execCommand("insertText", false, text); } catch { /* sin soporte */ }
    if (!done || doc.input.value !== text) {
      doc.input.value = text;
      doc.input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const transform = (fn, note) => {
    try {
      replaceText(fn(doc.input.value));
    } catch (e) {
      return run();
    }
    run(note);
  };

  // --- modo schema: activar / desactivar -------------------------------------

  /** El editor del schema no existe en el DOM hasta que se usa por primera vez. */
  const ensureSchemaEditor = () => {
    if (schemaEd) return;
    doc.pane.insertAdjacentHTML("afterend", paneHtml("schema-input", M.schemaLabel, M.schemaPlaceholder, `${id}-status`));
    schemaEd = makeEditor($('[data-pane="schema-input"]'), "schema-input");
    schemaEd.input.addEventListener("input", onInput);
  };

  const setMode = (next) => {
    mode = next;
    runToken++;
    clearTimeout(timer);
    if (next === "schema") ensureSchemaEditor();
    if (schemaEd) schemaEd.pane.hidden = next !== "schema";
    toolEl.classList.toggle("is-schema", next === "schema");
    $('[data-role="input-label"]').textContent = next === "schema" ? M.srcDocument : M.codeInput;
    doc.input.setAttribute("aria-label", next === "schema" ? M.srcDocument : M.codeInput);
    editors().forEach((e) => e.clearMarks());
    syncWarn();
    if (hasText()) run();
    else showIdle();
  };

  // --- eventos --------------------------------------------------------------

  doc.input.addEventListener("input", onInput);
  validateBtn.addEventListener("click", () => run());
  if (formatBtn) formatBtn.addEventListener("click", () => transform(format, M.valFormatted));
  if (minifyBtn) minifyBtn.addEventListener("click", () => transform(minify, M.valMinified));
  clearBtn.addEventListener("click", () => {
    editors().forEach((e) => { e.input.value = ""; });
    onInput();
    doc.input.focus();
  });
  const sampleBtn = btn("sample");
  if (sampleBtn) sampleBtn.addEventListener("click", () => {
    if (mode === "schema") {
      doc.input.value = schemaMode.sample.document;
      schemaEd.input.value = schemaMode.sample.schema;
    } else {
      doc.input.value = sample;
    }
    editors().forEach((e) => e.syncGutter());
    syncWarn();
    run();
  });
  if (modeToggle) modeToggle.addEventListener("change", () => setMode(modeToggle.checked ? "schema" : "single"));

  jumpBtn.addEventListener("click", () => {
    const cur = doc.current;
    if (cur && cur.offset != null) doc.jumpTo(cur);
  });

  doc.syncGutter();
  showIdle();
}
