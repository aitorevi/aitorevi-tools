import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { addWatermark, watermarkedFileName } from "../marca-de-agua-pdf/lib.js";

const require = createRequire(import.meta.url);
globalThis.self = globalThis;
require("../vendor/pdf-lib.min.js");
const PDFLib = globalThis.PDFLib;
const { PDFDocument } = PDFLib;

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return doc.save();
}

describe("addWatermark", () => {
  it("conserva el número de páginas", async () => {
    const src = await makePdf(3);
    const out = await addWatermark(PDFLib, src, { text: "BORRADOR" });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
  });

  it("lanza si el texto está vacío", async () => {
    const src = await makePdf(1);
    await expect(addWatermark(PDFLib, src, { text: "   " })).rejects.toThrow();
  });
});

describe("watermarkedFileName", () => {
  it("añade el sufijo -marca-de-agua.pdf", () => {
    expect(watermarkedFileName("doc")).toBe("doc-marca-de-agua.pdf");
  });
});
