import { test, expect } from "./fixtures.mjs";
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
    ["/validar-json/", "validator-guide"],
    ["/validar-xml/", "validator-guide"],
    ["/validar-yaml/", "validator-guide"],
    ["/validar-toml/", "validator-guide"],
    ["/validar-base64/", "validator-guide"],
    ["/validar-jwt/", "validator-guide"],
    ["/validar-uuid/", "validator-guide"],
    ["/validar-nif/", "validator-guide"],
    ["/validar-iban/", "validator-guide"],
  ]) {
    await page.goto(path);
    await expect(page.locator(`#${id} .tool-guide-title`)).toBeVisible();
    expect(await page.locator(`#${id} code`).count()).toBeGreaterThan(5);
  }
});

// Un JWT bien formado (header {alg:HS256,typ:JWT}, payload {sub,iat,exp} de 2023): caducado.
const JWT_OK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDM2MDB9.c2lnbmF0dXJl";

const UUID_OK = "550e8400-e29b-41d4-a716-446655440000";

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

test("validar-json: todo se puede usar solo con teclado (Ir al error y Validar)", async ({ page, browserName }) => {
  await page.goto("/validar-json/");
  const t = vj(page);
  // En Safari, Tab no enfoca botones ni enlaces por defecto: se recorre con Option+Tab.
  const TAB = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const tabTo = async (locator) => {
    for (let i = 0; i < 8; i++) {
      if (await locator.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press(TAB);
    }
    throw new Error(`No se llegó con ${TAB} al elemento`);
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
  await expect(page.locator("#validator-guide .tool-guide-title")).toHaveText("Errores típicos de JSON");
  await page.goto("/en/validate-json/");
  await expect(page.locator("#validator-guide .tool-guide-title")).toHaveText("Common JSON errors");
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
  // La línea es la misma en todos los motores; la columna no (cada motor señala un punto).
  await expect(t.detail).toContainText(/Línea 4, columna \d+/);
  await expect(t.detail).toContainText("se cierra con un nombre distinto");
  await expect(t.tech).toContainText(/mismatch/i); // «Opening and ending tag mismatch» / «mismatched tag»
  await expect(t.frame).toContainText("</libros>");
  await expect(t.mark).toBeVisible();
  await t.jump.click();
  const sel = await t.input.evaluate((el) => {
    const lines = el.value.split("\n");
    const start = lines.slice(0, 3).join("\n").length + 1;
    return { at: el.selectionStart, start, end: start + lines[3].length };
  });
  expect(sel.at).toBeGreaterThanOrEqual(sel.start);
  expect(sel.at).toBeLessThanOrEqual(sel.end);
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
  await expect(t.detail).toContainText(/Line 4, column \d+/);
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

test("validar-base64: el ejemplo señala el carácter, y uno válido muestra los datos", async ({ page }) => {
  await page.goto("/validar-base64/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Base64 no válido");
  await expect(t.detail).toContainText("Línea 2, columna 16");
  await expect(t.detail).toContainText("«!»");
  await expect(t.tech).toContainText('invalid character "!"');
  await expect(t.mark).toBeVisible();
  await t.jump.click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(await t.input.evaluate((el) => el.value.indexOf("!")));
  expect(await page.locator("#code-tool").getByRole("button", { name: /formatear|minificar/i }).count()).toBe(0);

  await t.input.fill("SGVsbG8=");
  await expect(t.headline).toHaveText("Base64 válido");
  await expect(t.meta.locator("dd")).toHaveText(["Común a ambos", "Sí", "5", "Sí"]);
  await t.input.fill("/w==");
  await expect(t.meta.locator("dd").nth(3)).toHaveText("No");
});

test("validar-jwt: el ejemplo (sin firma) falla; uno caducado es válido con aviso", async ({ page }) => {
  await page.goto("/validar-jwt/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("JWT no válido");
  await expect(t.detail).toContainText("Aquí hay 2");
  await expect(t.detail).toContainText("tres partes");
  await expect(t.mark).toBeVisible();

  await t.input.fill(JWT_OK);
  await expect(t.headline).toHaveText("JWT válido");
  await expect(t.detail).toContainText("No se verifica la firma");
  await expect(t.detail).toContainText("caducado desde el 2023-11-14T23:13:20.000Z");
  await expect(t.meta.locator("dt")).toHaveText(["Algoritmo", "Tipo", "Emitido", "Caduca"]);
  await expect(t.meta.locator("dd").nth(0)).toHaveText("HS256");

  await t.input.fill("Bearer " + JWT_OK);
  await expect(t.headline).toHaveText("JWT no válido");
  await expect(t.detail).toContainText("Quita «Bearer »");
  await t.input.fill(JWT_OK.replace(/\.[^.]*$/, ".sig!"));
  await expect(t.detail).toContainText("«!»");
});

test("EN: validate-base64 y validate-jwt muestran la UI en inglés", async ({ page }) => {
  await page.goto("/en/validate-base64/");
  let t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate Base64");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Invalid Base64");
  await expect(t.detail).toContainText("Line 2, column 16");
  await expect(t.detail).toContainText("“!”");
  await t.input.fill("QUJD");
  await expect(t.headline).toHaveText("Valid Base64");

  await page.goto("/en/validate-jwt/");
  t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate JWT");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("Invalid JWT");
  await expect(t.detail).toContainText("Here there are 2");
  await t.input.fill(JWT_OK);
  await expect(t.headline).toHaveText("Valid JWT");
  await expect(t.detail).toContainText("The token expired on 2023-11-14T23:13:20.000Z");
});

// --- Validadores de lista (UUID, NIF/CIF/NIE, IBAN) ---

const items = (page) => page.locator("#code-tool .validate-errors > li");

test("validar-uuid: varios valores resumen cuántos fallan y cada error salta a su línea", async ({ page }) => {
  await page.goto("/validar-uuid/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("2 de 4 no son válidos");
  await expect(items(page)).toHaveCount(2);
  await expect(items(page).nth(0)).toContainText("123e4567-e89b-12d3-a456-42661417400");
  await expect(items(page).nth(0)).toContainText("Línea 2, columna 36");
  await expect(items(page).nth(0)).toContainText("tiene 35");
  await expect(items(page).nth(1)).toContainText("«c» no es una variante válida");
  await expect(t.mark).toBeVisible();

  await items(page).nth(1).locator('[data-act="jump-item"]').click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(
    await t.input.evaluate((el) => el.value.indexOf("f47ac10b") + 19),
  );
  await expect(items(page).nth(1).locator('[data-act="jump-item"]')).toHaveAccessibleName(/Ir al error del valor f47ac10b/);
});

test("validar-uuid: todos válidos, uno solo y vacío", async ({ page }) => {
  await page.goto("/validar-uuid/");
  const t = vj(page);
  await t.input.fill(`${UUID_OK}\n00000000-0000-0000-0000-000000000000\n6ba7b810-9dad-11d1-80b4-00c04fd430c8`);
  await expect(t.headline).toHaveText("Los 3 valores son válidos");
  await expect(items(page)).toHaveCount(0);
  await expect(t.meta.locator("dt")).toHaveText(["Valores", "Versión 4 (aleatorio)", "UUID nulo (todo ceros)", "Versión 1 (fecha y equipo)"]);

  await t.input.fill(UUID_OK);
  await expect(t.headline).toHaveText("UUID válido");
  await expect(t.meta.locator("dt")).toHaveText(["Tipo"]);
  await expect(t.meta.locator("dd")).toHaveText(["Versión 4 (aleatorio)"]);

  await t.input.fill(UUID_OK.slice(0, 20));
  await expect(t.headline).toHaveText("UUID no válido");
  await expect(t.detail).toContainText("Línea 1, columna 21");
  await expect(items(page)).toHaveCount(0);
  await t.jump.click();
  expect(await t.input.evaluate((el) => el.selectionStart)).toBe(20);

  await t.input.fill("  \n ");
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
});

test("validar-uuid: más de 100 errores se recortan y avisan", async ({ page }) => {
  await page.goto("/validar-uuid/");
  const t = vj(page);
  await t.input.fill(Array.from({ length: 130 }, () => "nope").join("\n"));
  await expect(t.headline).toHaveText("130 de 130 no son válidos");
  await expect(items(page)).toHaveCount(100);
  await expect(page.locator("#code-tool .validate-more")).toContainText("30 valores no válidos más");
});

test("validar-nif: el ejemplo marca el control mal y el valor corto, y dice cuál debería ser", async ({ page }) => {
  await page.goto("/validar-nif/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("2 de 5 no son válidos");
  await expect(items(page).nth(0)).toContainText("12345678A");
  await expect(items(page).nth(0)).toContainText("debería ser Z");
  await expect(items(page).nth(1)).toContainText("Tiene 8 caracteres y debe tener 9");

  await t.input.fill("12345678Z\nX1234567L\nA58818501");
  await expect(t.headline).toHaveText("Los 3 valores son válidos");
  await expect(t.meta.locator("dd")).toHaveText(["3", "1", "1", "1"]);
  await t.input.fill("12.345.678-Z");
  await expect(t.detail).toContainText("Línea 1, columna 3");
  await expect(t.detail).toContainText("sin separadores");
});

test("validar-iban: el ejemplo falla en las cifras de control y en la longitud; los países salen con su nombre", async ({ page }) => {
  await page.goto("/validar-iban/");
  const t = vj(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("2 de 4 no son válidos");
  await expect(items(page).nth(0)).toContainText("Las cifras de control no cuadran");
  await expect(items(page).nth(1)).toContainText("Un IBAN de FR tiene 27 caracteres y este tiene 16");

  await t.input.fill("ES91 2100 0418 4502 0005 1332\nDE89 3704 0044 0532 0130 00");
  await expect(t.headline).toHaveText("Los 2 valores son válidos");
  await expect(t.meta.locator("dt")).toHaveText(["Valores", "España (ES)", "Alemania (DE)"]);
  await t.input.fill("es91 2100 0418 4502 0005 1332");
  await expect(t.headline).toHaveText("IBAN válido");
  await expect(t.meta.locator("dd")).toHaveText(["España (ES)"]);
});

test("EN: validate-uuid, validate-nif y validate-iban muestran la UI en inglés", async ({ page }) => {
  await page.goto("/en/validate-uuid/");
  let t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate UUID");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("2 of 4 are invalid");
  await expect(items(page).nth(0)).toContainText("Line 2, column 36");
  await expect(items(page).nth(1).locator('[data-act="jump-item"]')).toHaveText("Go to error");
  await t.input.fill(UUID_OK);
  await expect(t.headline).toHaveText("Valid UUID");

  await page.goto("/en/validate-nif/");
  t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate Spanish NIF, CIF and NIE");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("2 of 5 are invalid");
  await expect(items(page).nth(0)).toContainText("it should be Z");

  await page.goto("/en/validate-iban/");
  t = vj(page);
  await expect(page.locator("main h1")).toHaveText("Validate IBAN");
  await t.input.fill("ES91 2100 0418 4502 0005 1332");
  await expect(t.headline).toHaveText("Valid IBAN");
  await expect(t.meta.locator("dd")).toHaveText(["Spain (ES)"]);
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
  expect(await loaded("/validar-base64/")).toEqual([]);
  expect(await loaded("/validar-jwt/")).toEqual([]);
  for (const path of ["/validar-uuid/", "/validar-nif/", "/validar-iban/"]) expect(await loaded(path)).toEqual([]);
});

test("validar-yaml, toml, base64, jwt y listas: validar no genera ninguna petición de red", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  for (const path of ["/validar-yaml/", "/validar-toml/", "/validar-base64/", "/validar-jwt/", "/validar-uuid/", "/validar-nif/", "/validar-iban/"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const t = vj(page);
    const afterLoad = net.requests().length;
    await t.btn("sample").click();
    // Un solo error: botón del panel; varios (listas): el de su primer elemento.
    await ((await t.jump.isVisible()) ? t.jump : items(page).first().locator('[data-act="jump-item"]')).click();
    await t.input.fill(path.includes("yaml") ? "a: 1" : path.includes("base64") ? "QUJD" : path.includes("jwt") ? JWT_OK : path.includes("uuid") ? UUID_OK : path.includes("nif") ? "12345678Z" : path.includes("iban") ? "ES91 2100 0418 4502 0005 1332" : "a = 1");
    await expect(t.headline).toContainText("válido");
    await t.btn("clear").click();
    await page.waitForTimeout(300);
    expect(net.requests().slice(afterLoad)).toEqual([]);
  }
  expect(net.violations()).toEqual([]);
});

// --- Validar JSON · modo schema ---

const sm = (page) => ({
  ...vj(page),
  toggle: page.locator('#code-tool [data-role="mode"]'),
  schema: page.locator('#code-tool [data-role="schema-input"]'),
  schemaPane: page.locator('#code-tool [data-pane="schema-input"]'),
  items: page.locator("#code-tool .validate-errors > li"),
  more: page.locator("#code-tool .validate-more"),
  schemaMark: page.locator('#code-tool [data-pane="schema-input"] .validate-mark'),
  docMark: page.locator('#code-tool [data-pane="input"] .validate-mark'),
});

async function openSchemaMode(page, path = "/validar-json/") {
  await page.goto(path);
  const t = sm(page);
  await t.toggle.check();
  return t;
}

test("schema: el interruptor muestra el segundo editor y es accesible con teclado", async ({ page }) => {
  await page.goto("/validar-json/");
  const t = sm(page);
  await expect(t.schemaPane).toHaveCount(0); // el editor del schema no existe hasta que se usa
  await expect(t.toggle).toHaveAttribute("role", "switch");
  await t.toggle.focus();
  await page.keyboard.press("Space");
  await expect(t.toggle).toBeChecked();
  await expect(t.schemaPane).toBeVisible();
  await expect(t.schema).toHaveAccessibleName("Schema");
  await expect(t.input).toHaveAccessibleName("Documento");
  await expect(t.headline).toHaveText("Pega un documento y su schema para validarlo.");
  await page.keyboard.press("Space");
  await expect(t.toggle).not.toBeChecked();
  await expect(t.schemaPane).toBeHidden();
  await expect(t.input).toHaveAccessibleName("Entrada");
  await expect(t.headline).toHaveText("Pega o escribe algo para validarlo.");
});

test("schema: el ejemplo lista los errores con ruta, posición y pista", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("El documento no cumple el schema (4 errores)");
  await expect(t.status).toHaveClass(/is-invalid/);
  await expect(t.items).toHaveCount(4);
  const all = t.items.locator(":scope");
  await expect(all.nth(0)).toContainText("(raíz)");
  await expect(all.nth(0)).toContainText("Falta la propiedad obligatoria «activo».");
  await expect(all.nth(1)).toContainText("/edad");
  await expect(all.nth(1)).toContainText("Línea 3, columna 11");
  await expect(all.nth(1)).toContainText("menor que el mínimo permitido (0)");
  await expect(all.nth(2)).toContainText("/email");
  await expect(all.nth(2)).toContainText("formato «email»");
  await expect(all.nth(3)).toContainText("/roles");
  await expect(all.nth(3)).toContainText("elementos repetidos");
  // El origen se indica con texto, no solo con color.
  await expect(t.items.locator(".validate-error-src").first()).toHaveText("Documento");
  await expect(t.input).toHaveAttribute("aria-invalid", "true");
  await expect(t.schema).toHaveAttribute("aria-invalid", "false");
  await expect(t.docMark).toBeVisible();
});

test("schema: cada error salta a su posición exacta en el documento", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.btn("sample").click();
  await expect(t.items).toHaveCount(4);
  const char = () => t.input.evaluate((el) => ({ at: el.selectionStart, focused: document.activeElement === el, text: el.value.slice(el.selectionStart, el.selectionStart + 4) }));
  await t.items.nth(1).getByRole("button").click(); // /edad → el -3
  expect(await char()).toMatchObject({ focused: true, text: "-3,\n" });
  await t.items.nth(2).getByRole("button").click(); // /email
  expect((await char()).text).toBe('"ana');
  await t.items.nth(0).getByRole("button").click(); // raíz
  expect((await char()).at).toBe(0);
});

test("schema: un documento que cumple el schema", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.input.fill('{"nombre":"Ana","edad":30}');
  await t.schema.fill('{"type":"object","required":["nombre"],"properties":{"edad":{"type":"integer"}}}');
  await expect(t.headline).toHaveText("El documento cumple el schema");
  await expect(t.status).toHaveClass(/is-valid/);
  await expect(t.meta).toContainText("draft 2020-12");
  await expect(t.items).toHaveCount(0);
  await expect(t.btn("format")).toBeEnabled();
});

test("schema: un schema incorrecto se detecta antes de usarlo y salta al schema", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.input.fill("{}");
  await t.schema.fill('{\n  "type": "strin",\n  "properties": 5\n}');
  await expect(t.headline).toHaveText(/El schema no es válido \(\d+ errores\)/);
  await expect(t.items.first().locator(".validate-error-src")).toHaveText("Schema");
  const typeError = t.items.filter({ hasText: "/type" });
  await expect(typeError).toContainText("«type» debe ser uno de");
  await expect(t.items.filter({ hasText: "/properties" })).toContainText("Se esperaba un valor de tipo «object»");
  await expect(t.schema).toHaveAttribute("aria-invalid", "true");
  await expect(t.input).toHaveAttribute("aria-invalid", "false");
  await expect(t.schemaMark).toBeVisible();
  await typeError.getByRole("button").click();
  expect(await t.schema.evaluate((el) => ({ focused: document.activeElement === el, text: el.value.slice(el.selectionStart, el.selectionStart + 7) }))).toEqual({ focused: true, text: '"strin"' });
});

test("schema: errores de sintaxis en cada texto, con su origen", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.input.fill('{"a":1,}');
  await t.schema.fill('{"type":}');
  await expect(t.headline).toHaveText("Hay errores de sintaxis (2 errores)");
  await expect(t.items.nth(0).locator(".validate-error-src")).toHaveText("Schema");
  await expect(t.items.nth(1).locator(".validate-error-src")).toHaveText("Documento");
  await expect(t.items.nth(1)).toContainText("sobra una coma");
  await expect(t.btn("format")).toBeDisabled();
});

test("schema: si falta uno de los dos textos lo dice", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.input.fill('{"a":1}');
  await expect(t.headline).toHaveText("Falta el documento o el schema");
  await expect(t.items.first()).toContainText("Pega aquí el JSON Schema");
});

test("schema: una referencia que no se encuentra explica que no hay red", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.input.fill('{"a":1}');
  await t.schema.fill('{"properties":{"a":{"$ref":"https://example.com/s.json"}}}');
  await expect(t.headline).toContainText("El schema no es válido");
  await expect(t.items.first()).toContainText("https://example.com/s.json");
  await expect(t.items.first()).toContainText("no hace peticiones de red");
});

test("schema: con más de 100 errores muestra los primeros y cuántos faltan", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.schema.fill('{"type":"array","items":{"type":"number"}}');
  await t.input.evaluate((el) => {
    el.value = JSON.stringify(Array.from({ length: 150 }, () => "x"));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(t.headline).toHaveText("El documento no cumple el schema (150 errores)");
  await expect(t.items).toHaveCount(100);
  await expect(t.more).toContainText("50 errores más");
});

test("schema: una regex catastrófica no congela la página (se cancela si el motor tarda)", async ({ page, browserName }) => {
  test.setTimeout(40_000);
  const t = await openSchemaMode(page);
  await t.schema.fill('{"type":"string","pattern":"^(a+)+$"}');
  await t.input.fill('"' + "a".repeat(34) + '!"');
  // Mientras el Worker trabaja, el hilo principal responde enseguida.
  await page.waitForTimeout(500);
  const t0 = Date.now();
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
  expect(Date.now() - t0).toBeLessThan(1000);
  await t.input.press("End");
  const cancelled = "La validación se canceló";
  // V8 y SpiderMonkey se quedan atascados (se cancela a los 4 s); JavaScriptCore (Safari)
  // lo resuelve al instante y da el resultado correcto, así que ahí no hay nada que cancelar.
  const accepted = browserName === "webkit" ? [cancelled, "El documento no cumple el schema (1 error)"] : [cancelled];
  await expect.poll(async () => accepted.includes(await t.headline.innerText()), { timeout: 15_000 }).toBe(true);
  if ((await t.headline.innerText()) === cancelled) await expect(t.items.first()).toContainText("expresión regular");
  // Y se recupera: un schema sano vuelve a validar.
  await t.schema.fill('{"type":"string"}');
  await expect(t.headline).toHaveText("El documento cumple el schema", { timeout: 15_000 });
});

test("schema: la última validación gana al escribir deprisa", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.schema.fill('{"type":"number"}');
  await t.input.fill('"x"');
  await expect(t.headline).toContainText("no cumple el schema");
  await t.input.fill("5");
  await expect(t.headline).toHaveText("El documento cumple el schema");
});

test("EN: validate-json schema mode muestra la UI en inglés", async ({ page }) => {
  const t = await openSchemaMode(page, "/en/validate-json/");
  await expect(page.locator(".validate-switch-label")).toHaveText("Validate against a JSON Schema");
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("The document does not match the schema (4 errors)");
  await expect(t.items.nth(0)).toContainText("The required property “activo” is missing.");
  await expect(t.items.nth(0)).toContainText("(root)");
  await expect(t.items.nth(1).locator(".validate-error-src")).toHaveText("Document");
});

test("schema: no se descarga nada hasta activar el modo, y validar no genera peticiones", async ({ page, context, baseURL, browserName }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  await page.goto("/validar-json/", { waitUntil: "networkidle" });
  const t = sm(page);
  const loadedVendor = () => net.requests().filter((u) => u.includes("/vendor/json-schema")).length;
  expect(loadedVendor()).toBe(0);
  await t.toggle.check();
  await expect(t.schemaPane).toBeVisible();
  expect(loadedVendor()).toBe(0); // aún no hace falta: se pide al primer validar
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("El documento no cumple el schema (4 errores)");
  // Playwright no informa de las peticiones de un Worker en Firefox: ahí no se puede contar.
  const seesWorkerRequests = browserName !== "firefox";
  if (seesWorkerRequests) expect(loadedVendor()).toBe(1);
  const afterFirst = net.requests().length;
  await t.items.nth(1).getByRole("button").click();
  await t.input.fill('{"a":1}');
  await t.schema.fill('{"type":"object"}');
  await expect(t.headline).toHaveText("El documento cumple el schema");
  await t.btn("clear").click();
  await page.waitForTimeout(300);
  expect(net.requests().slice(afterFirst)).toEqual([]);
  if (seesWorkerRequests) expect(loadedVendor()).toBe(1);
  expect(net.violations()).toEqual([]);
});

test("schema: funciona con la CSP del sitio (sin eval) y sin errores de consola", async ({ page }) => {
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective)); });
  const t = await openSchemaMode(page);
  await t.btn("sample").click();
  await expect(t.headline).toHaveText("El documento no cumple el schema (4 errores)");
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(problems).toEqual([]);
});

// --- Casos límite de la UI compartida de validadores ---

async function mountExtra(page, options) {
  await page.goto("/validar-json/");
  await page.evaluate(async (opts) => {
    const { mountValidateTool } = await import("/lib/validate-tool.js");
    const host = document.createElement("div");
    host.id = "extra";
    document.body.append(host);
    const pick = (k) => (k === "validate" ? () => { throw new Error("boom"); } : k);
    mountValidateTool({
      mount: host, toolId: "validar-json",
      validate: opts.validateThrows ? pick("validate") : () => ({ valid: true, errors: [], meta: {} }),
      ...(opts.schemaThrows ? { schemaMode: { check: async () => { throw new Error("kaboom"); }, sample: { document: "{}", schema: "{}" } } } : {}),
    });
  }, options);
  const scope = (sel) => page.locator(`#extra ${sel}`);
  return {
    input: scope('[data-role="input"]'),
    schema: scope('[data-role="schema-input"]'),
    headline: scope(".validate-headline"),
    detail: scope(".validate-detail"),
    tech: scope(".validate-tech").first(),
    toggle: scope('[data-role="mode"]'),
    items: scope(".validate-errors > li"),
  };
}

test("UI de validadores: si el validador lanza una excepción se muestra, sin romper la página", async ({ page }) => {
  const t = await mountExtra(page, { validateThrows: true });
  await t.input.fill("lo que sea");
  await expect(t.headline).toHaveText("JSON no válido");
  await expect(t.tech).toContainText("boom");
  await expect(t.detail).toContainText("No se ha podido localizar la posición");
  await t.input.fill("otro texto");
  await expect(t.tech).toContainText("boom"); // y sigue funcionando al seguir escribiendo
});

test("UI de validadores: si falla la comprobación del schema se muestra el error sin origen", async ({ page }) => {
  const t = await mountExtra(page, { schemaThrows: true });
  await t.toggle.check();
  await t.input.fill("{}");
  await t.schema.fill("{}");
  await expect(t.items).toHaveCount(1);
  await expect(t.items.first()).toContainText("kaboom");
  await expect(t.items.first().locator(".validate-error-src")).toHaveCount(0);
});

test("schema: desactivar y volver a activar el modo conserva los textos", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.btn("sample").click();
  await expect(t.items).toHaveCount(4);
  const [doc, schema] = [await t.input.inputValue(), await t.schema.inputValue()];
  await t.toggle.uncheck();
  await expect(t.schemaPane).toBeHidden();
  await expect(t.input).toHaveValue(doc);
  await t.toggle.check();
  await expect(t.schema).toHaveValue(schema);
  await expect(t.items).toHaveCount(4); // vuelve a validar al reactivarlo
});

test("schema: Vaciar limpia los dos editores y el resultado", async ({ page }) => {
  const t = await openSchemaMode(page);
  await t.btn("sample").click();
  await expect(t.items).toHaveCount(4);
  await t.btn("clear").click();
  await expect(t.input).toHaveValue("");
  await expect(t.schema).toHaveValue("");
  await expect(t.items).toHaveCount(0);
  await expect(t.headline).toHaveText("Pega un documento y su schema para validarlo.");
  await expect(t.docMark).toBeHidden();
});

test("hub: la subsección Validar lista las nueve herramientas y el buscador las encuentra", async ({ page }) => {
  await page.goto("/");
  const sub = page.locator('[data-subsection="validar"]');
  await expect(sub.locator(".subsection-title")).toHaveText("Validar");
  await expect(sub.locator(".tool-card")).toHaveCount(9);
  for (const [name, href] of [["Validar JSON", "/validar-json/"], ["Validar XML", "/validar-xml/"], ["Validar YAML", "/validar-yaml/"], ["Validar TOML", "/validar-toml/"], ["Validar Base64", "/validar-base64/"], ["Validar JWT", "/validar-jwt/"], ["Validar UUID", "/validar-uuid/"], ["Validar NIF / CIF / NIE", "/validar-nif/"], ["Validar IBAN", "/validar-iban/"]]) {
    await expect(sub.locator(`a.tool-card[href="${href}"] .tool-name`)).toHaveText(name);
  }
  await page.locator("#hub-search").fill("toml");
  await expect(sub.locator(".tool-card:visible")).toHaveCount(1);
  await page.locator("#hub-search").fill("pdf");
  await expect(sub).toBeHidden();
  await page.goto("/en/");
  await expect(page.locator('[data-subsection="validar"] .subsection-title')).toHaveText("Validate");
});

test("hub: el buscador oculta de verdad las tarjetas que no coinciden", async ({ page }) => {
  await page.goto("/");
  for (const query of ["pdf", "json", "zzz-no-existe"]) {
    await page.locator("#hub-search").fill(query);
    // Invariante: una tarjeta con [hidden] nunca puede estar visible.
    const leaked = await page.locator(".tool-card[hidden]").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
    expect(leaked, `«${query}»: tarjetas ocultas que se siguen viendo`).toBe(0);
    const total = await page.locator(".tool-card:not(.is-soon)").count();
    const shown = await page.locator(".tool-card:not(.is-soon):visible").count();
    expect(shown, query).toBe(query === "zzz-no-existe" ? 0 : shown);
    if (query === "pdf") expect(shown).toBeLessThan(total);
  }
  await expect(page.locator("#hub-empty")).toBeVisible();
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
