import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { mergePdfs, mergedFileName } from "../pdf-merge/lib.js";

// Misma pdf-lib vendorizada que usa la app (UMD usa `self` como global).
const require = createRequire(import.meta.url);
globalThis.self = globalThis;
require("../vendor/pdf-lib.min.js");
const { PDFDocument } = globalThis.PDFLib;

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return doc.save();
}

describe("mergePdfs", () => {
  it("suma las páginas de todos los PDFs respetando el orden", async () => {
    const a = await makePdf(2);
    const b = await makePdf(3);
    const merged = await mergePdfs(PDFDocument, [a, b]);
    const out = await PDFDocument.load(merged);
    expect(out.getPageCount()).toBe(5);
  });

  it("funciona con un único PDF", async () => {
    const a = await makePdf(4);
    const merged = await mergePdfs(PDFDocument, [a]);
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(4);
  });

  it("no muta los PDFs de origen", async () => {
    const a = await makePdf(2);
    const b = await makePdf(2);
    await mergePdfs(PDFDocument, [a, b]);
    expect((await PDFDocument.load(a)).getPageCount()).toBe(2);
  });

  it("lanza si no hay fuentes", async () => {
    await expect(mergePdfs(PDFDocument, [])).rejects.toThrow();
  });
});

describe("mergedFileName", () => {
  it("añade el sufijo -unido.pdf", () => {
    expect(mergedFileName("informe")).toBe("informe-unido.pdf");
  });
});
