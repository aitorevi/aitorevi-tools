// Helper compartido de los validadores: monta el editor con numeración de líneas,
// el panel de resultado y los botones, y recibe la lógica pura de cada formato.
// Un validador es `(texto) => { valid, errors, meta }` (ver lib/validators/result.js).
// Sin red ni dependencias externas: solo DOM + los textos i18n de runtime.
import { fmt, msgs } from "./i18n.js";
import { buildCodeFrame } from "./validators/frame.js";

/** A partir de este tamaño (caracteres) la validación automática se desactiva. */
export const AUTO_LIMIT = 1_000_000;

const ICONS = { idle: "–", valid: "✓", invalid: "✕" };
let uid = 0;

/**
 * @param {Object} opts
 * @param {string|HTMLElement} opts.mount
 * @param {string} opts.toolId                  id de la tool (textos i18n)
 * @param {(text: string) => Object} opts.validate
 * @param {(meta: Object, M: Object) => Array<[string, string]>} [opts.metaItems]
 *        pares [etiqueta, valor] que se muestran cuando el texto es válido
 * @param {(text: string) => string} [opts.format]   embellece (puede lanzar)
 * @param {(text: string) => string} [opts.minify]   minifica (puede lanzar)
 * @param {string} [opts.sample]                ejemplo para el botón "Probar ejemplo"
 * @param {number} [opts.debounceMs=300]
 * @param {number} [opts.autoLimit=AUTO_LIMIT]
 */
export function mountValidateTool({
  mount, toolId, validate, metaItems, format, minify, sample,
  debounceMs = 300, autoLimit = AUTO_LIMIT,
}) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;
  if (!root || typeof validate !== "function") return;

  const M = msgs(toolId);
  const id = `validate-${++uid}`;
  const hints = M.hints || {};

  root.innerHTML = `
    <div class="code-tool validate-tool">
      <div class="code-io">
        <div class="code-pane">
          <div class="code-bar">
            <span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="code-bar-label">${M.codeInput}</span>
          </div>
          <div class="validate-editor" data-role="editor">
            <div class="validate-gutter" data-role="gutter" aria-hidden="true">1</div>
            <textarea class="code-area validate-input" data-role="input" spellcheck="false"
                      autocapitalize="off" autocomplete="off" autocorrect="off"
                      placeholder="${M.valPlaceholder}" aria-label="${M.codeInput}"
                      aria-describedby="${id}-status"></textarea>
            <div class="validate-mark" data-role="mark" aria-hidden="true" hidden></div>
            <div class="validate-caret" data-role="caret" aria-hidden="true" hidden></div>
            <span class="validate-measure" data-role="measure" aria-hidden="true"></span>
          </div>
        </div>
        <div class="code-pane code-pane-out">
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
  const input = $('[data-role="input"]');
  const gutter = $('[data-role="gutter"]');
  const editor = $('[data-role="editor"]');
  const mark = $('[data-role="mark"]');
  const caret = $('[data-role="caret"]');
  const measure = $('[data-role="measure"]');
  const status = $('[data-role="status"]');
  const icon = $('[data-role="icon"]');
  const headline = $('[data-role="headline"]');
  const detail = $('[data-role="detail"]');
  const tech = $('[data-role="tech"]');
  const frameEl = $('[data-role="frame"]');
  const metaEl = $('[data-role="meta"]');
  const warnEl = $('[data-role="warn"]');
  const jumpBtn = $('[data-act="jump"]');
  const btn = (act) => $(`[data-act="${act}"]`);
  const validateBtn = btn("validate");
  const formatBtn = btn("format");
  const minifyBtn = btn("minify");
  const clearBtn = btn("clear");

  let timer = null;
  let gutterLines = 0;
  let current = null; // { line, column, offset } del error visible, o null

  // --- editor: numeración de líneas y marcas del error ---------------------

  const syncGutter = () => {
    const lines = input.value.split("\n").length;
    if (lines !== gutterLines) {
      gutterLines = lines;
      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    }
    gutter.scrollTop = input.scrollTop;
  };

  const lineHeight = () => parseFloat(getComputedStyle(input).lineHeight) || 20;

  /** Pinta la banda de la línea y la marca de la columna del error. */
  const placeMarks = () => {
    if (!current || current.line == null) { mark.hidden = true; caret.hidden = true; return; }
    const cs = getComputedStyle(input);
    const lh = lineHeight();
    mark.style.height = `${lh}px`;
    mark.style.top = `${parseFloat(cs.paddingTop) + (current.line - 1) * lh - input.scrollTop}px`;
    mark.hidden = false;

    const lineText = input.value.split("\n")[current.line - 1] || "";
    measure.textContent = lineText.slice(0, Math.max(0, current.column - 1));
    const x = measure.getBoundingClientRect().width;
    measure.textContent = lineText.charAt(current.column - 1) || "0";
    const w = measure.getBoundingClientRect().width;
    const left = gutter.offsetWidth + parseFloat(cs.paddingLeft) + x - input.scrollLeft;
    caret.style.height = `${lh}px`;
    caret.style.top = mark.style.top;
    caret.style.left = `${left}px`;
    caret.style.width = `${Math.max(w, 2)}px`;
    caret.hidden = left < gutter.offsetWidth || left > editor.clientWidth;
  };

  const clearMarks = () => { current = null; mark.hidden = true; caret.hidden = true; };

  // --- panel de resultado ---------------------------------------------------

  const setStatus = (kind, headlineText, detailText = "", techText = "") => {
    status.className = `validate-status is-${kind}`;
    icon.textContent = ICONS[kind];
    headline.textContent = headlineText;
    detail.textContent = detailText;
    tech.textContent = techText;
    detail.hidden = !detailText;
    tech.hidden = !techText;
    input.setAttribute("aria-invalid", kind === "invalid" ? "true" : "false");
  };

  const resetDetails = () => {
    clearMarks();
    frameEl.hidden = true;
    jumpBtn.hidden = true;
    metaEl.hidden = true;
    metaEl.replaceChildren();
  };

  const syncButtons = (valid) => {
    const empty = input.value.trim() === "";
    validateBtn.disabled = empty;
    clearBtn.disabled = empty;
    if (formatBtn) formatBtn.disabled = !valid;
    if (minifyBtn) minifyBtn.disabled = !valid;
  };

  const showIdle = (text = M.valIdle) => {
    resetDetails();
    setStatus("idle", text);
    syncButtons(false);
  };

  const showValid = (result, note) => {
    resetDetails();
    const notes = [note, result.meta && result.meta.hadBom ? M.valBom : ""].filter(Boolean);
    setStatus("valid", M.valid, notes.join(" "));
    const items = metaItems ? metaItems(result.meta || {}, M) : [];
    for (const [label, value] of items) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      metaEl.append(dt, dd);
    }
    metaEl.hidden = items.length === 0;
    syncButtons(true);
  };

  const showInvalid = (result, text) => {
    resetDetails();
    const err = result.errors[0];
    const located = err.line != null && err.column != null;
    const where = located ? fmt(M.valAt, { line: err.line, column: err.column }) : M.valNoPosition;
    const hintText = (err.hint && hints[err.hint]) || "";
    setStatus("invalid", M.invalid, [where + ".", hintText].filter(Boolean).join(" "), `${M.valTechnical}: ${err.message}`);
    if (located) {
      const frame = buildCodeFrame(text, err.line, err.column);
      frameEl.textContent = frame;
      frameEl.hidden = !frame;
      current = { line: err.line, column: err.column, offset: err.offset };
      jumpBtn.textContent = fmt(M.valJump, { line: err.line, column: err.column });
      jumpBtn.hidden = err.offset == null;
      placeMarks();
    }
    syncButtons(false);
  };

  /** Valida el contenido actual y pinta el resultado. */
  const run = (note = "") => {
    clearTimeout(timer);
    const text = input.value;
    if (text.trim() === "") return showIdle();
    let result;
    try {
      result = validate(text);
    } catch (e) {
      return showInvalid({ errors: [{ message: (e && e.message) || String(e), line: null, column: null, offset: null, hint: null }] }, text);
    }
    if (result.valid) return showValid(result, note);
    if (result.errors[0].hint === "empty") return showIdle();
    return showInvalid(result, text);
  };

  const isLarge = () => input.value.length > autoLimit;
  const syncWarn = () => {
    warnEl.textContent = isLarge()
      ? fmt(M.valLarge, { size: (input.value.length / 1_000_000).toFixed(1) })
      : "";
  };

  const onInput = () => {
    clearTimeout(timer);
    syncGutter();
    syncWarn();
    clearMarks();
    if (formatBtn) formatBtn.disabled = true;
    if (minifyBtn) minifyBtn.disabled = true;
    validateBtn.disabled = clearBtn.disabled = input.value.trim() === "";
    if (input.value.trim() === "") return showIdle();
    if (isLarge()) return showIdle(M.valPending);
    timer = setTimeout(() => run(), debounceMs);
  };

  /** Sustituye el contenido conservando el historial de deshacer si el navegador lo permite. */
  const replaceText = (text) => {
    input.focus();
    input.select();
    let done = false;
    try { done = document.execCommand("insertText", false, text); } catch { /* sin soporte */ }
    if (!done || input.value !== text) {
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const transform = (fn, note) => {
    try {
      replaceText(fn(input.value));
    } catch (e) {
      return run();
    }
    run(note);
  };

  // --- eventos --------------------------------------------------------------

  input.addEventListener("input", onInput);
  input.addEventListener("scroll", () => { gutter.scrollTop = input.scrollTop; placeMarks(); });
  window.addEventListener("resize", placeMarks);
  validateBtn.addEventListener("click", () => run());
  if (formatBtn) formatBtn.addEventListener("click", () => transform(format, M.valFormatted));
  if (minifyBtn) minifyBtn.addEventListener("click", () => transform(minify, M.valMinified));
  clearBtn.addEventListener("click", () => {
    input.value = "";
    onInput();
    input.focus();
  });
  const sampleBtn = btn("sample");
  if (sampleBtn) sampleBtn.addEventListener("click", () => {
    input.value = sample;
    syncGutter();
    syncWarn();
    run();
  });

  jumpBtn.addEventListener("click", () => {
    if (!current || current.offset == null) return;
    const { line, offset } = current;
    input.focus();
    input.setSelectionRange(offset, Math.min(offset + 1, input.value.length));
    // Centra la línea en vertical (el foco solo garantiza que el cursor sea visible).
    const lh = lineHeight();
    input.scrollTop = Math.max(0, (line - 1) * lh - input.clientHeight / 2);
    syncGutter();
    placeMarks();
  });

  syncGutter();
  showIdle();
}
