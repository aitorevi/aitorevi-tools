import { test, expect } from "@playwright/test";

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
async function dropPdfWithContent(page, pages) {
  await page.evaluate(async (n) => {
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) {
      const p = doc.addPage([300, 400]);
      p.drawRectangle({ x: 20, y: 20, width: 60, height: 60 });
    }
    const bytes = await doc.save();
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "doc.pdf", { type: "application/pdf" }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, pages);
}

test("n-up: genera y descarga el PDF recolocado", async ({ page }) => {
  await page.goto("/n-up-pdf/");
  await dropPdfWithContent(page, 8);
  await expect(page.locator("#workspace")).toBeVisible();
  await page.selectOption("#nup-per", "4");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#apply-btn"),
  ]);
  expect(download.suggestedFilename()).toMatch(/-4-por-hoja\.pdf$/);
});
