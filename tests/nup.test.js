import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { nUpPdf, nUpFileName } from "../n-up-pdf/lib.js";

const require = createRequire(import.meta.url);
globalThis.self = globalThis;
require("../vendor/pdf-lib.min.js");
const PDFLib = globalThis.PDFLib;
const { PDFDocument } = PDFLib;

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([300, 400]);
    // Las páginas deben tener un stream Contents para poder embeberse (n-up).
    page.drawRectangle({ x: 20, y: 20, width: 60, height: 60 });
  }
  return doc.save();
}

describe("nUpPdf", () => {
  it("4 por hoja: 8 páginas → 2 hojas", async () => {
    const out = await nUpPdf(PDFLib, await makePdf(8), { perSheet: 4 });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
  });

  it("2 por hoja: 5 páginas → 3 hojas (redondeo hacia arriba)", async () => {
    const out = await nUpPdf(PDFLib, await makePdf(5), { perSheet: 2 });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
  });

  it("landscape usa hoja apaisada (ancho > alto)", async () => {
    const out = await nUpPdf(PDFLib, await makePdf(2), { perSheet: 2, landscape: true });
    const { width, height } = (await PDFDocument.load(out)).getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });
});

describe("nUpFileName", () => {
  it("incluye el número por hoja", () => {
    expect(nUpFileName("doc", 4)).toBe("doc-4-por-hoja.pdf");
  });
});
