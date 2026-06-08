import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import { imagesToPdf, outputFileName, isSupportedImage } from "../imagen-a-pdf/lib.js";

const require = createRequire(import.meta.url);
globalThis.self = globalThis;
require("../vendor/pdf-lib.min.js");
const { PDFDocument } = globalThis.PDFLib;

// PNG transparente de 1×1 (bytes reales para embedPng).
const PNG_1x1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    "base64"
  )
);

describe("isSupportedImage", () => {
  it("acepta JPG y PNG", () => {
    expect(isSupportedImage({ type: "image/png", name: "a.png" })).toBe(true);
    expect(isSupportedImage({ type: "image/jpeg", name: "a.jpg" })).toBe(true);
    expect(isSupportedImage({ type: "", name: "a.JPEG" })).toBe(true);
  });
  it("rechaza otros formatos", () => {
    expect(isSupportedImage({ type: "image/webp", name: "a.webp" })).toBe(false);
    expect(isSupportedImage({ type: "application/pdf", name: "a.pdf" })).toBe(false);
  });
});

describe("imagesToPdf", () => {
  it("crea una página por imagen, en orden", async () => {
    const bytes = await imagesToPdf(PDFDocument, [
      { bytes: PNG_1x1, type: "image/png" },
      { bytes: PNG_1x1, type: "image/png" },
    ]);
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(2);
  });

  it("la página toma el tamaño de la imagen", async () => {
    const bytes = await imagesToPdf(PDFDocument, [{ bytes: PNG_1x1, type: "image/png" }]);
    const out = await PDFDocument.load(bytes);
    const { width, height } = out.getPage(0).getSize();
    expect(width).toBe(1);
    expect(height).toBe(1);
  });

  it("lanza si no hay imágenes", async () => {
    await expect(imagesToPdf(PDFDocument, [])).rejects.toThrow();
  });
});

describe("outputFileName", () => {
  it("añade la extensión .pdf", () => {
    expect(outputFileName("fotos")).toBe("fotos.pdf");
  });
});
