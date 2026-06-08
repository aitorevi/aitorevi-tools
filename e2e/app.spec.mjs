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

test("el hub lista la herramienta y enlaza a /pdf-separator/", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Separador de PDF" })).toBeVisible();
  await expect(page.locator("a.tool-card")).toHaveAttribute("href", "/pdf-separator/");
});

test("soltar un PDF renderiza una tarjeta por página", async ({ page }) => {
  await page.goto("/pdf-separator/");
  await dropPdf(page, 4);
  await expect(page.locator("#pages-list .page-item")).toHaveCount(4);
  await expect(page.locator("#workspace")).toBeVisible();
});

test("descarga el ZIP con el nombre derivado del fichero", async ({ page }) => {
  await page.goto("/pdf-separator/");
  await dropPdf(page, 3, "informe anual.pdf");
  await expect(page.locator("#pages-list .page-item")).toHaveCount(3);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#zip-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("informe anual-paginas.zip");
});

test("quitar la selección deshabilita los botones de descarga", async ({ page }) => {
  await page.goto("/pdf-separator/");
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
