import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { auditNetwork } from "./helpers/network.mjs";

const REGISTRY = JSON.parse(await readFile(new URL("../tools.json", import.meta.url), "utf8"));

// Fija un idioma para desactivar el auto-redirect por idioma del navegador (lang.js).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try { localStorage.setItem("lang", "es"); } catch {}
  });
});

// Genera un PDF en la propia página y simula soltarlo en la ventana.
async function dropPdf(page, pages, name = "informe.pdf") {
  await page.evaluate(
    async ({ pages, name }) => {
      const { PDFDocument } = window.PDFLib;
      const doc = await PDFDocument.create();
      for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
      const bytes = await doc.save();
      const file = new File([bytes], name, { type: "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      window.dispatchEvent(
        new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true })
      );
    },
    { pages, name }
  );
}

test("el hub lista las herramientas y enlaza a cada una", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Separar PDF" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unir PDF" })).toBeVisible();
  await expect(page.locator('a.tool-card[href="/separar-pdf/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/unir-pdf/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/imagen-a-pdf/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/marca-de-agua-pdf/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/n-up-pdf/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/comprimir-imagen/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/convertir-imagen/"]')).toBeVisible();
  await expect(page.locator('a.tool-card[href="/quitar-metadatos-imagen/"]')).toBeVisible();
});

test("soltar un PDF renderiza una tarjeta por página", async ({ page }) => {
  await page.goto("/separar-pdf/");
  await dropPdf(page, 4);
  await expect(page.locator("#pages-list .page-item")).toHaveCount(4);
  await expect(page.locator("#workspace")).toBeVisible();
});

test("descarga el ZIP con el nombre derivado del fichero", async ({ page }) => {
  await page.goto("/separar-pdf/");
  await dropPdf(page, 3, "informe anual.pdf");
  await expect(page.locator("#pages-list .page-item")).toHaveCount(3);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#zip-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("informe anual-paginas.zip");
});

test("quitar la selección deshabilita los botones de descarga", async ({ page }) => {
  await page.goto("/separar-pdf/");
  await dropPdf(page, 3);
  await page.click("#select-none");
  await expect(page.locator("#zip-btn")).toBeDisabled();
  await expect(page.locator("#individual-btn")).toBeDisabled();
});

test("el toggle de tema persiste tras recargar", async ({ page }) => {
  await page.goto("/");
  const wasDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  await page.click("#theme-toggle");
  await page.reload();
  const nowDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  expect(nowDark).toBe(!wasDark);
});

// --- Unir PDF ---

// Genera varios PDFs en la página y los suelta a la vez en la ventana.
async function dropPdfs(page, pageCounts) {
  await page.evaluate(async (counts) => {
    const { PDFDocument } = window.PDFLib;
    const dt = new DataTransfer();
    for (let i = 0; i < counts.length; i++) {
      const doc = await PDFDocument.create();
      for (let p = 0; p < counts[i]; p++) doc.addPage([300, 400]);
      const bytes = await doc.save();
      dt.items.add(new File([bytes], `doc-${i + 1}.pdf`, { type: "application/pdf" }));
    }
    window.dispatchEvent(
      new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true })
    );
  }, pageCounts);
}

test("unir: soltar varios PDFs los lista en filas reordenables", async ({ page }) => {
  await page.goto("/unir-pdf/");
  await dropPdfs(page, [2, 3]);
  await expect(page.locator("#file-list .file-row")).toHaveCount(2);
  await expect(page.locator("#merge-btn")).toBeEnabled();
});

test("unir: con un solo PDF el botón sigue deshabilitado", async ({ page }) => {
  await page.goto("/unir-pdf/");
  await dropPdfs(page, [2]);
  await expect(page.locator("#file-list .file-row")).toHaveCount(1);
  await expect(page.locator("#merge-btn")).toBeDisabled();
});

test("unir: combina y descarga un único PDF", async ({ page }) => {
  await page.goto("/unir-pdf/");
  await dropPdfs(page, [2, 3]);
  await expect(page.locator("#file-list .file-row")).toHaveCount(2);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#merge-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/-unido\.pdf$/);
});

// --- Imagen a PDF ---

async function dropImages(page, n) {
  await page.evaluate(async (count) => {
    function makePng(i) {
      return new Promise((resolve) => {
        const c = document.createElement("canvas");
        c.width = 20; c.height = 20;
        const ctx = c.getContext("2d");
        ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`;
        ctx.fillRect(0, 0, 20, 20);
        c.toBlob((b) => resolve(new File([b], `img-${i}.png`, { type: "image/png" })), "image/png");
      });
    }
    const dt = new DataTransfer();
    for (let i = 0; i < count; i++) dt.items.add(await makePng(i));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, n);
}

test("imagen a pdf: soltar imágenes las lista en filas reordenables", async ({ page }) => {
  await page.goto("/imagen-a-pdf/");
  await dropImages(page, 3);
  await expect(page.locator("#file-list .file-row")).toHaveCount(3);
  await expect(page.locator("#create-btn")).toBeEnabled();
});

test("imagen a pdf: crea y descarga el PDF", async ({ page }) => {
  await page.goto("/imagen-a-pdf/");
  await dropImages(page, 2);
  await expect(page.locator("#file-list .file-row")).toHaveCount(2);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#create-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

// --- Marca de agua PDF ---

test("marca de agua: aplica y descarga el PDF", async ({ page }) => {
  await page.goto("/marca-de-agua-pdf/");
  await dropPdf(page, 2);
  await expect(page.locator("#workspace")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#apply-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/-marca-de-agua\.pdf$/);
});

test("marca de agua: con el texto vacío no descarga (muestra error)", async ({ page }) => {
  await page.goto("/marca-de-agua-pdf/");
  await dropPdf(page, 1);
  await page.fill("#wm-text", "");
  await page.click("#apply-btn");
  await expect(page.locator("#status")).toHaveClass(/error/);
});

// --- n-up PDF ---

// PDF con contenido (las páginas en blanco no se pueden embeber para n-up).
async function dropPdfWithContent(page, pages, name = "doc.pdf") {
  await page.evaluate(async ({ n, name }) => {
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([300, 400]);
      p.drawRectangle({ x: 20, y: 20, width: 60, height: 60 });
    }
    const bytes = await doc.save();
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], name, { type: "application/pdf" }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { n: pages, name });
}

test("n-up: combina varios PDFs y descarga el recolocado", async ({ page }) => {
  await page.goto("/n-up-pdf/");
  await dropPdfWithContent(page, 5, "uno.pdf");
  await dropPdfWithContent(page, 3, "dos.pdf");
  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator("#file-list .file-row")).toHaveCount(2);
  await page.selectOption("#nup-per", "4");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#apply-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/-4-por-hoja\.pdf$/);
});

// --- Herramientas de imagen (Canvas) ---

async function dropOneImage(page) {
  await page.evaluate(async () => {
    const blob = await new Promise((resolve) => {
      const c = document.createElement("canvas");
      c.width = 40; c.height = 30;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#3366cc"; ctx.fillRect(0, 0, 40, 30);
      c.toBlob((b) => resolve(b), "image/png");
    });
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "foto.png", { type: "image/png" }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
}

test("convertir imagen: convierte a WebP y descarga", async ({ page }) => {
  await page.goto("/convertir-imagen/");
  await dropOneImage(page);
  await expect(page.locator("#workspace")).toBeVisible();
  await page.selectOption("#target-format", "image/webp");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#convert-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("foto.webp");
});

test("comprimir imagen: comprime y descarga", async ({ page }) => {
  await page.goto("/comprimir-imagen/");
  await dropOneImage(page);
  await expect(page.locator("#workspace")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#compress-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/-comprimida\.(webp|jpg)$/);
});

test("quitar metadatos: limpia y descarga", async ({ page }) => {
  await page.goto("/quitar-metadatos-imagen/");
  await dropOneImage(page);
  await expect(page.locator("#workspace")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#clean-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("foto-sin-metadatos.png");
});

test("convertir imagen: HEIC se convierte localmente a JPEG", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  await page.goto("/convertir-imagen/");

  const fixture = await readFile(new URL("./fixtures/colors-no-alpha.heic", import.meta.url));
  await page.locator("#file-input").setInputFiles({
    name: "foto.heic",
    mimeType: "image/heic",
    buffer: fixture,
  });

  await expect(page.locator("#workspace")).toBeVisible();
  await expect(page.locator("#target-format")).toHaveValue("image/jpeg");
  await expect(page.locator("#estimate")).toContainText("JPG");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#convert-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("foto.jpg");
  const jpeg = await readFile(await download.path());
  expect([...jpeg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect(net.requests().some((u) => u.endsWith(".wasm"))).toBe(true);
  expect(net.violations()).toEqual([]);
});

test("convertir imagen: varias imágenes se descargan en un ZIP", async ({ page }) => {
  await page.goto("/convertir-imagen/");
  const png = (color) => page.evaluate(async (fill) => {
    const c = document.createElement("canvas");
    c.width = 20; c.height = 10;
    const ctx = c.getContext("2d");
    ctx.fillStyle = fill; ctx.fillRect(0, 0, 20, 10);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, color);
  await page.locator("#file-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: Buffer.from(await png("#f00")) },
    { name: "a.jpg", mimeType: "image/png", buffer: Buffer.from(await png("#0f0")) },
    { name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("hola") },
  ]);

  await expect(page.locator("#file-list .file-row")).toHaveCount(2);
  await expect(page.locator("#status")).toContainText("notas.txt");
  await page.selectOption("#target-format", "image/webp");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#zip-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("imagenes-webp.zip");
  const zip = await readFile(await download.path());
  expect(zip.includes(Buffer.from("a.webp"))).toBe(true);
  expect(zip.includes(Buffer.from("a-2.webp"))).toBe(true);
});

test("convertir imagen: un formato no admitido muestra un error", async ({ page }) => {
  await page.goto("/convertir-imagen/");
  await page.locator("#file-input").setInputFiles({
    name: "doc.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(page.locator("#status")).toBeVisible();
  await expect(page.locator("#status")).toHaveClass(/error/);
  await expect(page.locator("#status")).toContainText("doc.pdf");
  await expect(page.locator("#workspace")).toBeHidden();
});

// --- Inglés (/en/) ---

test("EN: split-pdf muestra la UI en inglés y descarga", async ({ page }) => {
  await page.goto("/en/split-pdf/");
  await expect(page.locator("main h1")).toHaveText("Split PDF");
  await expect(page.locator(".nav-links .lang-group .lang.is-active")).toHaveText("EN");
  await dropPdf(page, 3);
  await expect(page.locator("#selected-count")).toHaveText("3 selected");
  await expect(page.locator("#zip-btn")).toContainText("Download selection as ZIP");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#zip-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test("EN: el selector lleva del hub español al inglés", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".nav-links .lang-group .lang.is-active")).toHaveText("ES");
  await page.locator('.nav-links .lang-group a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator("main h1")).toHaveText("Tools");
});

// --- Código: Formatear JSON ---

test("formatear-json: ejemplo precargado → formatear → copiar", async ({ page }) => {
  await page.goto("/formatear-json/");
  const input = page.locator('.code-area[data-role="input"]');
  const output = page.locator(".code-out");

  // La entrada llega ya precargada con el ejemplo (la salida sigue vacía).
  await expect(input).not.toHaveValue("");
  await expect(output).toHaveValue("");

  // "Formatear" produce JSON con sangría en la salida.
  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/\n {2}"name": "aitorevi\.tools"/);

  // "Copiar" da feedback (el botón pasa a "¡Copiado!").
  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("formatear-json: JSON inválido muestra error y deja la salida vacía", async ({ page }) => {
  await page.goto("/formatear-json/");
  await page.fill('.code-area[data-role="input"]', "{ esto no es json");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-alert")).not.toBeEmpty();
  await expect(page.locator(".code-out")).toHaveValue("");
});

// --- Código: Formatear XML ---

test("formatear-xml: ejemplo precargado → formatear → copiar", async ({ page }) => {
  await page.goto("/formatear-xml/");
  const input = page.locator('.code-area[data-role="input"]');
  const output = page.locator(".code-out");

  await expect(input).not.toHaveValue("");
  await expect(output).toHaveValue("");

  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/\n {2}<to>Aitor<\/to>/);

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("formatear-xml: XML mal formado muestra error y deja la salida vacía", async ({ page }) => {
  await page.goto("/formatear-xml/");
  await page.fill('.code-area[data-role="input"]', "<a><b></a>");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-alert")).not.toBeEmpty();
  await expect(page.locator(".code-out")).toHaveValue("");
});

// --- Código: Formatear SQL ---

test("formatear-sql: ejemplo precargado → formatear (multi-dialecto) → copiar", async ({ page }) => {
  await page.goto("/formatear-sql/");
  const input = page.locator('.code-area[data-role="input"]');
  const output = page.locator(".code-out");

  await expect(input).not.toHaveValue("");
  await expect(page.locator('[data-role="select"]')).toBeVisible();

  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/SELECT/);

  // Cambiar de dialecto re-formatea la salida.
  await page.selectOption('[data-role="select"]', "mysql");
  await expect(output).toHaveValue(/SELECT/);

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

// --- Código: Formatear YAML ---

test("formatear-yaml: ejemplo precargado → formatear → copiar", async ({ page }) => {
  await page.goto("/formatear-yaml/");
  const output = page.locator(".code-out");

  await expect(page.locator('.code-area[data-role="input"]')).not.toHaveValue("");
  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/name: aitorevi\.tools/);

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("formatear-yaml: YAML inválido muestra error y deja la salida vacía", async ({ page }) => {
  await page.goto("/formatear-yaml/");
  await page.fill('.code-area[data-role="input"]', "a: [1, 2");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-alert")).not.toBeEmpty();
  await expect(page.locator(".code-out")).toHaveValue("");
});

// --- Código: Formatear HTML/CSS ---

test("formatear-html-css: ejemplo (HTML) precargado → formatear → copiar", async ({ page }) => {
  await page.goto("/formatear-html-css/");
  const output = page.locator(".code-out");

  await expect(page.locator('.code-area[data-role="input"]')).not.toHaveValue("");
  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/\n {2}<h2>/);

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("formatear-html-css: detecta y formatea CSS", async ({ page }) => {
  await page.goto("/formatear-html-css/");
  await page.fill('.code-area[data-role="input"]', ".a{color:red;margin:0}");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-out")).toHaveValue(/\.a \{\n {2}color: red;/);
});

// --- Código: JSON a C# / TypeScript ---

test("json-a-csharp: ejemplo precargado → generar C# y TypeScript → copiar", async ({ page }) => {
  await page.goto("/json-a-csharp/");
  const output = page.locator(".code-out");

  await expect(page.locator('.code-area[data-role="input"]')).not.toHaveValue("");
  await expect(page.locator('[data-role="select"]')).toBeVisible();

  // C# (lenguaje por defecto). quicktype es pesado: damos margen de tiempo.
  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/public partial class Root/, { timeout: 15000 });

  // Cambiar a TypeScript regenera la salida.
  await page.selectOption('[data-role="select"]', "typescript");
  await expect(output).toHaveValue(/export interface Root/, { timeout: 15000 });

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("json-a-csharp: JSON inválido muestra error", async ({ page }) => {
  await page.goto("/json-a-csharp/");
  await page.fill('.code-area[data-role="input"]', "{ no es json");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-alert")).not.toBeEmpty();
});

// --- Código: Formatear JS/TS (Prettier) ---

test("formatear-js: ejemplo precargado → formatear (JS y TS) → copiar", async ({ page }) => {
  await page.goto("/formatear-js/");
  const output = page.locator(".code-out");

  await expect(page.locator('.code-area[data-role="input"]')).not.toHaveValue("");
  await expect(page.locator('[data-role="select"]')).toBeVisible();

  await page.click('[data-act="format"]');
  await expect(output).toHaveValue(/const greet = \(name\) =>/, { timeout: 15000 });

  await page.selectOption('[data-role="select"]', "typescript");
  await expect(output).toHaveValue(/const greet/, { timeout: 15000 });

  await page.click('[data-act="copy"]');
  await expect(page.locator('[data-act="copy"]')).toContainText("¡Copiado!");
});

test("formatear-js: JS con error de sintaxis muestra error", async ({ page }) => {
  await page.goto("/formatear-js/");
  await page.fill('.code-area[data-role="input"]', "const x = {");
  await page.click('[data-act="format"]');
  await expect(page.locator(".code-alert")).not.toBeEmpty();
});

// --- Código: Decodificar JWT ---

test("jwt: ejemplo precargado → muestra header y payload → copiar", async ({ page }) => {
  await page.goto("/jwt/");
  await expect(page.locator("#jwt-input")).not.toHaveValue("");
  await expect(page.locator("#jwt-header")).toHaveValue(/"alg": "HS256"/);
  await expect(page.locator("#jwt-payload")).toHaveValue(/"role": "admin"/);
  await expect(page.locator("#jwt-info")).toContainText("HS256");

  // Botón de copiar del payload (en la barra de su panel, dentro del decode section).
  await page.locator("#jwt-decode-section .code-copy").last().click();
  await expect(page.locator("#jwt-decode-section .code-copy").last()).toContainText("¡Copiado!");

  // Notas de JWT (guía) renderizadas debajo.
  await expect(page.locator("#jwt-guide .tool-guide-title")).toBeVisible();
  expect(await page.locator("#jwt-guide code").count()).toBeGreaterThan(10);
});

test("jwt: token inválido muestra error", async ({ page }) => {
  await page.goto("/jwt/");
  await page.fill("#jwt-input", "esto-no-es-un-jwt");
  await expect(page.locator("#jwt-alert")).not.toBeEmpty();
  await expect(page.locator("#jwt-header")).toHaveValue("");
});

// --- Código: Tester de regex ---

test("regex: ejemplo precargado resalta las coincidencias", async ({ page }) => {
  await page.goto("/regex/");
  await expect(page.locator("#re-pattern")).not.toHaveValue("");
  await expect(page.locator("#re-output mark")).toHaveCount(2);
  await expect(page.locator("#re-count")).toContainText("2");

  // La guía de regex se renderiza debajo, con sus chips de símbolos.
  await expect(page.locator(".tool-guide-title")).toBeVisible();
  expect(await page.locator(".tool-guide-group code").count()).toBeGreaterThan(10);
});

test("regex: cambiar el patrón actualiza las coincidencias; uno inválido da error", async ({ page }) => {
  await page.goto("/regex/");
  await page.fill("#re-pattern", "\\d+");
  await page.fill("#re-text", "a1 b22 c333");
  await expect(page.locator("#re-output mark")).toHaveCount(3);

  await page.fill("#re-pattern", "(");
  await expect(page.locator("#re-alert")).not.toBeEmpty();
});

// --- Código: Diff de texto ---

test("diff: ejemplo precargado muestra añadidas y quitadas", async ({ page }) => {
  await page.goto("/diff/");
  await expect(page.locator("#diff-a")).not.toHaveValue("");
  await expect(page.locator(".diff-output .diff-add")).toHaveCount(3);
  await expect(page.locator(".diff-output .diff-del")).toHaveCount(2);
  await expect(page.locator("#diff-summary")).toContainText("+3");
});

test("diff: textos idénticos lo indican y no marcan cambios", async ({ page }) => {
  await page.goto("/diff/");
  await page.fill("#diff-a", "igual\nlinea");
  await page.fill("#diff-b", "igual\nlinea");
  await expect(page.locator(".diff-output .diff-add")).toHaveCount(0);
  await expect(page.locator(".diff-output .diff-del")).toHaveCount(0);
  await expect(page.locator("#diff-summary")).not.toBeEmpty();
});

// --- Código: Base64, hash, URL (transform en vivo) ---

test("base64: codifica el ejemplo y decodifica al cambiar de modo", async ({ page }) => {
  await page.goto("/base64/");
  const out = page.locator(".code-out");
  await expect(out).toHaveValue(/^SGVsbG8/); // el ejemplo, codificado
  await page.fill('.code-area[data-role="input"]', "SGVsbG8=");
  await page.selectOption('[data-role="select"]', "decode");
  await expect(out).toHaveValue("Hello");
});

test("hash: muestra el SHA-256 y cambia con el algoritmo", async ({ page }) => {
  await page.goto("/hash/");
  const out = page.locator(".code-out");
  await expect(out).toHaveValue(/^[0-9a-f]{64}$/); // SHA-256
  await page.selectOption('[data-role="select"]', "SHA-1");
  await expect(out).toHaveValue(/^[0-9a-f]{40}$/); // SHA-1
});

test("url: codifica el ejemplo (percent-encoding)", async ({ page }) => {
  await page.goto("/url-encode/");
  await expect(page.locator(".code-out")).toHaveValue(/%20|%26/);
});

// --- Código: JWT firmar ---

test("jwt: modo sign → firma el payload de muestra con HS256", async ({ page }) => {
  await page.goto("/jwt/");
  await page.selectOption("#jwt-mode", "sign");
  await expect(page.locator("#jwt-sign-section")).toBeVisible();
  await expect(page.locator("#jwt-decode-section")).toBeHidden();
  // El payload y secreto de muestra producen un token válido (3 partes)
  await expect(page.locator("#jwt-token-out")).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/);
});

test("jwt: modo sign → cambiar algoritmo produce token diferente", async ({ page }) => {
  await page.goto("/jwt/");
  await page.selectOption("#jwt-mode", "sign");
  const t256 = await page.locator("#jwt-token-out").inputValue();
  await page.selectOption("#jwt-sign-alg", "HS512");
  const t512 = await page.locator("#jwt-token-out").inputValue();
  expect(t256).not.toBe(t512);
});

// --- Código: Conversor de datos ---

test("convertir-datos: CSV precargado se convierte a JSON automáticamente", async ({ page }) => {
  await page.goto("/convertir-datos/");
  const output = page.locator("#output-data");
  await expect(output).toHaveValue(/Alice/);
  await expect(output).toHaveValue(/Madrid/);
  const json = JSON.parse(await output.inputValue());
  expect(json).toHaveLength(2);
});

test("convertir-datos: botón ⇄ invierte la conversión", async ({ page }) => {
  await page.goto("/convertir-datos/");
  const from = page.locator("#from-format");
  const to   = page.locator("#to-format");
  await expect(from).toHaveValue("csv");
  await expect(to).toHaveValue("json");
  await page.click("#swap-btn");
  await expect(from).toHaveValue("json");
  await expect(to).toHaveValue("csv");
  // La salida ahora es CSV
  await expect(page.locator("#output-data")).toHaveValue(/name,age,city/);
});

test("convertir-datos: CSV → YAML produce YAML válido", async ({ page }) => {
  await page.goto("/convertir-datos/");
  await page.selectOption("#to-format", "yaml");
  await expect(page.locator("#output-data")).toHaveValue(/name: Alice/);
});

test("código: el toggle de word-wrap aplica .is-wrapped con los defaults correctos", async ({ page }) => {
  // Formateador: entrada sin wrap por defecto; el toggle lo activa.
  await page.goto("/formatear-json/");
  const inputTa = page.locator('[data-role="input"]');
  const inWrap = page.locator('.code-pane:not(.code-pane-out) .code-wrap');
  await expect(inWrap).toHaveAttribute("aria-pressed", "false");
  await expect(inputTa).not.toHaveClass(/is-wrapped/);
  await inWrap.click();
  await expect(inWrap).toHaveAttribute("aria-pressed", "true");
  await expect(inputTa).toHaveClass(/is-wrapped/);

  // Base64: entrada y salida con wrap activado por defecto.
  await page.goto("/base64/");
  await expect(page.locator('[data-role="input"]')).toHaveClass(/is-wrapped/);
  await expect(page.locator(".code-out")).toHaveClass(/is-wrapped/);
});

test("código: las guías de JSON, XML, YAML, SQL y HTML/CSS se renderizan", async ({ page }) => {
  for (const [path, id] of [
    ["/formatear-json/", "json-guide"],
    ["/formatear-xml/", "xml-guide"],
    ["/formatear-yaml/", "yaml-guide"],
    ["/formatear-sql/", "sql-guide"],
    ["/formatear-html-css/", "htmlcss-guide"],
    ["/validar-json/", "validate-json-guide"],
    ["/validar-xml/", "validate-xml-guide"],
    ["/validar-yaml/", "validate-yaml-guide"],
    ["/validar-toml/", "validate-toml-guide"],
  ]) {
    await page.goto(path);
    await expect(page.locator(`#${id} .tool-guide-title`)).toBeVisible();
    expect(await page.locator(`#${id} code`).count()).toBeGreaterThan(5);
  }
});

// --- Validar JSON ---

const vj = (page) => ({
  input: page.locator('#code-tool [data-role="input"]'),
  status: page.locator('#code-tool [data-role="status"]'),
  headline: page.locator("#code-tool .validate-headline"),
  detail: page.locator("#code-tool .validate-detail"),
  tech: page.locator("#code-tool .validate-tech"),
  frame: page.locator("#code-tool .validate-frame"),
  meta: page.locator("#code-tool .validate-meta"),
  mark: page.locator("#code-tool .validate-mark"),
  caret: page.locator("#code-tool .validate-caret"),
  warn: page.locator('#code-tool [data-role="warn"]'),
  jump: page.locator('#code-tool [data-act="jump"]'),
  btn: (act) => page.locator(`#code-tool [data-act="${act}"]`),
});

test("validar-json: JSON válido muestra el estado y los datos", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
  await t.input.fill('{"a":{"b":[1,2]},"c":null}');
  await expect(t.headline).toHaveText("JSON válido");
  await expect(t.status).toHaveClass(/is-valid/);
  await expect(t.status.locator(".validate-icon")).toHaveText("✓");
  await expect(t.meta).toContainText("Objeto");
  await expect(t.meta).toContainText("Tipo raíz");
  await expect(t.meta.locator("dd").nth(1)).toHaveText("3"); // claves a, b, c
  await expect(t.meta.locator("dd").nth(2)).toHaveText("3"); // profundidad
  await expect(t.mark).toBeHidden();
  await expect(t.input).toHaveAttribute("aria-invalid", "false");
});

test("validar-json: un primitivo suelto es JSON válido", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.input.fill("42");
  await expect(t.headline).toHaveText("JSON válido");
  await expect(t.meta).toContainText("Número");
});

test("validar-json: el error indica línea, columna, pista y resalta la posición", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("JSON no válido");
  await expect(t.status).toHaveClass(/is-invalid/);
  await expect(t.status.locator(".validate-icon")).toHaveText("✕");
  await expect(t.detail).toContainText("Línea 3, columna 34");
  await expect(t.detail).toContainText("sobra una coma");
  await expect(t.tech).toContainText("Detalle técnico");
  await expect(t.frame).toContainText("^");
  await expect(t.mark).toBeVisible();
  await expect(t.caret).toBeVisible();
  await expect(t.input).toHaveAttribute("aria-invalid", "true");
  await expect(t.btn("format")).toBeDisabled();
  await expect(t.btn("minify")).toBeDisabled();
});

test("validar-json: 'Ir al error' lleva el cursor a la posición exacta", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.btn("sample").click();
  await t.jump.click();
  const sel = await t.input.evaluate((el) => ({
    focused: document.activeElement === el,
    start: el.selectionStart,
    end: el.selectionEnd,
    char: el.value.slice(el.selectionStart, el.selectionEnd),
    expected: el.value.indexOf(",]") + 1,
  }));
  expect(sel.focused).toBe(true);
  expect(sel.start).toBe(sel.expected);
  expect(sel.char).toBe("]");
});

test("validar-json: valida solo al escribir (debounce) y se puede usar con teclado", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await expect(t.btn("validate")).toBeDisabled();
  await t.input.click();
  await page.keyboard.type('{"a":1,}');
  await expect(t.headline).toHaveText("JSON no válido");
  await expect(t.detail).toContainText("Línea 1, columna 8");
});

test("validar-json: todo se puede usar solo con teclado (Ir al error y Validar)", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  const tabTo = async (locator) => {
    for (let i = 0; i < 8; i++) {
      if (await locator.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error("No se llegó con Tab al elemento");
  };
  await t.input.click();
  await page.keyboard.type('{"a":1,}');
  await expect(t.headline).toHaveText("JSON no válido");
  // Tab desde el editor llega a "Ir al error"; Enter lleva el cursor al fallo.
  await tabTo(t.jump);
  await page.keyboard.press("Enter");
  expect(await t.input.evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd))).toBe("}");
  // Y con Tab se alcanza "Validar"; Enter valida de nuevo.
  await tabTo(t.btn("validate"));
  await page.keyboard.press("Enter");
  await expect(t.headline).toHaveText("JSON no válido");
});

test("validar-json: formatear y minificar reutilizan el formateador", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.input.fill('{"a":1,"b":[2,3]}');
  await expect(t.btn("format")).toBeEnabled();
  await t.btn("format").click();
  await expect(t.input).toHaveValue('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  await expect(t.detail).toHaveText("Se ha formateado el texto.");
  await t.btn("minify").click();
  await expect(t.input).toHaveValue('{"a":1,"b":[2,3]}');
  await expect(t.headline).toHaveText("JSON válido");
});

test("validar-json: formatear y minificar no alteran ningún dato", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  const original = '{"id":12345678901234567890,"x":1.0,"x":2,"e":"caf\\u00e9","n":1E+2}';
  await t.input.fill(original);
  await expect(t.headline).toHaveText("JSON válido");
  await t.btn("format").click();
  const pretty = await t.input.inputValue();
  for (const piece of ["12345678901234567890", '"x": 1.0', '"x": 2', "caf\\u00e9", "1E+2"]) {
    expect(pretty).toContain(piece);
  }
  await t.btn("minify").click();
  await expect(t.input).toHaveValue(original);
});

test("validar-json: la guía de errores típicos se muestra", async ({ page }) => {
  await page.goto("/validar-json/");
  await expect(page.locator("#validate-json-guide .tool-guide-title")).toHaveText("Errores típicos de JSON");
  await page.goto("/en/validate-json/");
  await expect(page.locator("#validate-json-guide .tool-guide-title")).toHaveText("Common JSON errors");
});

test("validar-json: la región de resultado se anuncia con aria-live y está enlazada al editor", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await expect(t.status).toHaveAttribute("role", "status");
  await expect(t.status).toHaveAttribute("aria-live", "polite");
  await expect(t.status).toHaveAttribute("aria-atomic", "true");
  const id = await t.status.getAttribute("id");
  await expect(t.input).toHaveAttribute("aria-describedby", id);
  await expect(t.input).toHaveAccessibleName("Entrada");
});

test("validar-json: con más de 1 MB desactiva la validación automática y avisa", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.input.evaluate((el) => {
    el.value = '["' + "a".repeat(1_100_000) + '"]';
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(t.warn).toContainText("validación automática está desactivada");
  await expect(t.headline).toHaveText("Texto muy grande: pulsa «Validar» para comprobarlo.");
  await page.waitForTimeout(700); // más que el debounce: no debe haber validado solo
  await expect(t.headline).toHaveText("Texto muy grande: pulsa «Validar» para comprobarlo.");
  await t.btn("validate").click();
  await expect(t.headline).toHaveText("JSON válido");
  // Al volver por debajo del límite vuelve la validación automática y desaparece el aviso.
  await t.input.fill("[1]");
  await expect(t.warn).toHaveText("");
  await expect(t.headline).toHaveText("JSON válido");
});

test("validar-json: un BOM inicial es válido y se avisa", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.input.fill("﻿[1]");
  await expect(t.headline).toHaveText("JSON válido");
  await expect(t.detail).toContainText("BOM");
});

test("validar-json: vaciar limpia el resultado", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("JSON no válido");
  await t.btn("clear").click();
  await expect(t.input).toHaveValue("");
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
  await expect(t.mark).toBeHidden();
  await expect(t.frame).toBeHidden();
});

test("EN: validate-json muestra la UI en inglés", async ({ page }) => {
  await page.goto("/en/validate-json/");
  const t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate JSON");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Invalid JSON");
  await expect(t.detail).toContainText("Line 3, column 34");
  await expect(t.detail).toContainText("extra comma");
  await t.input.fill('{"a":1}');
  await expect(t.headline).toHaveText("Valid JSON");
});

test("validar-json: validar no genera ninguna petición de red", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  await page.goto("/validar-json/", { waitUntil: "networkidle" });
  const t = vj(page);
  const afterLoad = net.requests().length;
  await t.btn("sample").click();
  await t.jump.click();
  await t.input.fill('{"a":[1,2,3]}');
  await expect(t.headline).toHaveText("JSON válido");
  await t.btn("format").click();
  await t.btn("minify").click();
  await t.input.evaluate((el) => {
    el.value = '["' + "a".repeat(1_100_000) + '"]';
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await t.btn("validate").click();
  await expect(t.headline).toHaveText("JSON válido");
  await t.btn("clear").click();
  await page.waitForTimeout(300);
  expect(net.requests().slice(afterLoad)).toEqual([]);
  expect(net.violations()).toEqual([]);
});

// --- Validar XML (misma UI que Validar JSON) ---

test("validar-xml: el ejemplo muestra el error con línea, columna y pista", async ({ page }) => {
  await page.goto("/validar-xml/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("XML mal formado");
  await expect(t.status).toHaveClass(/is-invalid/);
  await expect(t.detail).toContainText("Línea 4, columna 12");
  await expect(t.detail).toContainText("se cierra con un nombre distinto");
  await expect(t.tech).toContainText("Opening and ending tag mismatch");
  await expect(t.frame).toContainText("</libros>");
  await expect(t.mark).toBeVisible();
  await t.jump.click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(
    await t.input.evaluate((el) => el.value.indexOf("</libros>") + "</libros>".length),
  );
});

test("validar-xml: XML bien formado muestra los datos y no ofrece formatear", async ({ page }) => {
  await page.goto("/validar-xml/");
  const t = vj(page);
  await t.input.fill('<?xml version="1.0"?><catalogo><libro id="1"><titulo>A</titulo></libro></catalogo>');
  await expect(t.headline).toHaveText("XML bien formado");
  await expect(t.status).toHaveClass(/is-valid/);
  await expect(t.meta).toContainText("<catalogo>");
  await expect(t.meta.locator("dd").nth(1)).toHaveText("3"); // elementos
  await expect(t.meta.locator("dd").nth(2)).toHaveText("1"); // atributos
  await expect(t.meta.locator("dd").nth(3)).toHaveText("3"); // profundidad
  await expect(t.btn("format")).toHaveCount(0);
  await expect(t.btn("minify")).toHaveCount(0);
});

test("validar-xml: valida al escribir y la entrada vacía es neutra", async ({ page }) => {
  await page.goto("/validar-xml/");
  const t = vj(page);
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
  await t.input.click();
  await page.keyboard.type("<a><b></a>");
  await expect(t.headline).toHaveText("XML mal formado");
  await expect(t.input).toHaveAttribute("aria-invalid", "true");
  await t.btn("clear").click();
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
});

test("EN: validate-xml muestra la UI en inglés", async ({ page }) => {
  await page.goto("/en/validate-xml/");
  const t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate XML");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Malformed XML");
  await expect(t.detail).toContainText("Line 4, column 12");
  await t.input.fill("<a/>");
  await expect(t.headline).toHaveText("Well-formed XML");
});

test("validar-xml: validar no genera ninguna petición de red", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  await page.goto("/validar-xml/", { waitUntil: "networkidle" });
  const t = vj(page);
  const afterLoad = net.requests().length;
  await t.btn("sample").click();
  await t.jump.click();
  await t.input.fill('<!DOCTYPE a SYSTEM "https://example.com/x.dtd"><a/>');
  await expect(t.headline).toHaveText("XML bien formado");
  await t.btn("clear").click();
  await page.waitForTimeout(300);
  expect(net.requests().slice(afterLoad)).toEqual([]);
  expect(net.violations()).toEqual([]);
});

// --- Validar YAML y Validar TOML (misma UI; cada librería solo en su página) ---

test("validar-yaml: el ejemplo muestra el error con línea, columna y pista", async ({ page }) => {
  await page.goto("/validar-yaml/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("YAML no válido");
  await expect(t.status).toHaveClass(/is-invalid/);
  await expect(t.detail).toContainText("Línea 5, columna 2");
  await expect(t.detail).toContainText("La sangría no es coherente");
  await expect(t.tech).toContainText("Bad indentation");
  await expect(t.mark).toBeVisible();
  await t.jump.click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(
    await t.input.evaluate((el) => el.value.indexOf("\n - yaml") + 2),
  );
  await expect(t.btn("format")).toHaveCount(0);
});

test("validar-yaml: YAML válido, con varios documentos, muestra los datos", async ({ page }) => {
  await page.goto("/validar-yaml/");
  const t = vj(page);
  await t.input.fill("a: 1\nb:\n  - x\n  - y: 2");
  await expect(t.headline).toHaveText("YAML válido");
  await expect(t.meta).toContainText("Mapa (objeto)");
  await expect(t.meta.locator("dd").nth(0)).toHaveText("1"); // documentos
  await expect(t.meta.locator("dd").nth(2)).toHaveText("3"); // claves: a, b, y
  await expect(t.meta.locator("dd").nth(3)).toHaveText("3"); // profundidad
  await t.input.fill("a: 1\n---\nb: [1, 2]");
  await expect(t.headline).toHaveText("YAML válido");
  await expect(t.meta.locator("dd").nth(0)).toHaveText("2");
  await expect(t.meta).not.toContainText("Tipo raíz"); // con varios documentos no se muestra
});

test("validar-yaml: la pista distingue tabuladores", async ({ page }) => {
  await page.goto("/validar-yaml/");
  const t = vj(page);
  await t.input.fill("a:\n\tb: 1");
  await expect(t.headline).toHaveText("YAML no válido");
  await expect(t.detail).toContainText("Línea 2, columna 1");
  await expect(t.detail).toContainText("tabuladores");
});

test("validar-toml: el ejemplo muestra el error con línea, columna y pista", async ({ page }) => {
  await page.goto("/validar-toml/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("TOML no válido");
  await expect(t.detail).toContainText("Línea 6, columna 8");
  await expect(t.detail).toContainText("comillas dobles");
  await expect(t.tech).toContainText("Invalid value");
  await expect(t.mark).toBeVisible();
  await t.jump.click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(
    await t.input.evaluate((el) => el.value.indexOf("localhost")),
  );
});

test("validar-toml: TOML válido muestra los datos", async ({ page }) => {
  await page.goto("/validar-toml/");
  const t = vj(page);
  await t.input.fill('a = 1\n[t]\nb = { c = 2 }\n[[l]]\nx = 1');
  await expect(t.headline).toHaveText("TOML válido");
  await expect(t.meta.locator("dd").nth(0)).toHaveText("6"); // claves
  await expect(t.meta.locator("dd").nth(1)).toHaveText("3"); // tablas
  await expect(t.meta.locator("dd").nth(2)).toHaveText("3"); // profundidad
});

test("EN: validate-yaml y validate-toml muestran la UI en inglés", async ({ page }) => {
  await page.goto("/en/validate-yaml/");
  let t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate YAML");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Invalid YAML");
  await expect(t.detail).toContainText("Line 5, column 2");
  await t.input.fill("a: 1");
  await expect(t.headline).toHaveText("Valid YAML");

  await page.goto("/en/validate-toml/");
  t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate TOML");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Invalid TOML");
  await expect(t.detail).toContainText("Line 6, column 8");
  await t.input.fill("a = 1");
  await expect(t.headline).toHaveText("Valid TOML");
});

test("cada librería se carga solo en la página que la usa", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  const loaded = async (path) => {
    const before = net.requests().length;
    await page.goto(path, { waitUntil: "networkidle" });
    return net.requests().slice(before).filter((u) => u.includes("/vendor/")).map((u) => new URL(u).pathname);
  };
  expect(await loaded("/validar-json/")).toEqual([]);
  expect(await loaded("/validar-xml/")).toEqual([]);
  expect(await loaded("/validar-yaml/")).toEqual(["/vendor/js-yaml.min.js"]);
  expect(await loaded("/validar-toml/")).toEqual(["/vendor/smol-toml.min.js"]);
});

test("validar-yaml y validar-toml: validar no genera ninguna petición de red", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  for (const path of ["/validar-yaml/", "/validar-toml/"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const t = vj(page);
    const afterLoad = net.requests().length;
    await t.btn("sample").click();
    await t.jump.click();
    await t.input.fill(path.includes("yaml") ? "a: 1" : "a = 1");
    await expect(t.headline).toContainText("válido");
    await t.btn("clear").click();
    await page.waitForTimeout(300);
    expect(net.requests().slice(afterLoad)).toEqual([]);
  }
  expect(net.violations()).toEqual([]);
});

// --- Promesa "sin red": ninguna página saca datos ni contacta con terceros ---

for (const lang of ["es", "en"]) {
  for (const tool of REGISTRY.tools) {
    const path = `/${lang === "en" ? "en/" : ""}${tool.slug[lang]}/`;
    test(`sin red: ${path} solo carga recursos estáticos del propio sitio`, async ({ page, context, baseURL }) => {
      const net = auditNetwork(context, new URL(baseURL).origin);
      await page.goto(path, { waitUntil: "networkidle" });
      expect(net.violations()).toEqual([]);
    });
  }
}
