import { test, expect } from "@playwright/test";

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

// --- Inglés (/en/) ---

test("EN: split-pdf muestra la UI en inglés y descarga", async ({ page }) => {
  await page.goto("/en/split-pdf/");
  await expect(page.locator("main h1")).toHaveText("Split PDF");
  await expect(page.locator(".lang-group .lang.is-active")).toHaveText("EN");
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
  await expect(page.locator(".lang-group .lang.is-active")).toHaveText("ES");
  await page.locator('.lang-group a[hreflang="en"]').click();
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

  // Botón de copiar del payload (segundo .code-copy).
  await page.locator("#jwt-payload").locator("xpath=following-sibling::button").click();
  await expect(page.locator(".jwt-tool .code-copy").last()).toContainText("¡Copiado!");

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

test("código: las guías de JSON, XML, YAML, SQL y HTML/CSS se renderizan", async ({ page }) => {
  for (const [path, id] of [
    ["/formatear-json/", "json-guide"],
    ["/formatear-xml/", "xml-guide"],
    ["/formatear-yaml/", "yaml-guide"],
    ["/formatear-sql/", "sql-guide"],
    ["/formatear-html-css/", "htmlcss-guide"],
  ]) {
    await page.goto(path);
    await expect(page.locator(`#${id} .tool-guide-title`)).toBeVisible();
    expect(await page.locator(`#${id} code`).count()).toBeGreaterThan(5);
  }
});
