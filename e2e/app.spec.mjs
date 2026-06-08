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
