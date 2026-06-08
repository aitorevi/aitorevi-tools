import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import {
  sanitizeBaseName,
  formatBytes,
  pageFileName,
  zipFileName,
  isPdf,
  extractPage,
} from "../pdf-separator/lib.js";

// Cargamos la MISMA librería vendorizada que usa la app (UMD), no una versión npm.
// El bundle UMD usa `self` como global; en Node lo apuntamos a globalThis.
const require = createRequire(import.meta.url);
globalThis.self = globalThis;
require("../vendor/pdf-lib.min.js");
const { PDFDocument } = globalThis.PDFLib;

describe("sanitizeBaseName", () => {
  it("quita la extensión .pdf (insensible a mayúsculas)", () => {
    expect(sanitizeBaseName("informe.pdf")).toBe("informe");
    expect(sanitizeBaseName("informe.PDF")).toBe("informe");
  });

  it("reemplaza caracteres problemáticos por guiones", () => {
    expect(sanitizeBaseName('a/b:c*d?"e<f>g|h.pdf')).toBe("a-b-c-d-e-f-g-h");
  });

  it('cae a "documento" si el nombre queda vacío', () => {
    expect(sanitizeBaseName(".pdf")).toBe("documento");
    expect(sanitizeBaseName("")).toBe("documento");
  });
});

describe("formatBytes", () => {
  it("muestra bytes por debajo de 1 KB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });
  it("muestra KB sin decimales", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });
  it("muestra MB con un decimal", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});

describe("nombres de descarga", () => {
  it("pageFileName", () => {
    expect(pageFileName("informe", 3)).toBe("informe-pagina-3.pdf");
  });
  it("zipFileName", () => {
    expect(zipFileName("informe")).toBe("informe-paginas.zip");
  });
});

describe("isPdf", () => {
  it("acepta application/pdf", () => {
    expect(isPdf({ type: "application/pdf", name: "x.pdf" })).toBe(true);
  });
  it("acepta por extensión aunque el type esté vacío", () => {
    expect(isPdf({ type: "", name: "x.pdf" })).toBe(true);
  });
  it("rechaza otros tipos", () => {
    expect(isPdf({ type: "image/png", name: "x.png" })).toBe(false);
  });
});

describe("extractPage", () => {
  async function makePdf(pages) {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
    return doc.save();
  }

  it("devuelve un PDF de una sola página", async () => {
    const src = await makePdf(5);
    const bytes = await extractPage(PDFDocument, src, 2);
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });

  it("no muta el PDF original", async () => {
    const src = await makePdf(3);
    await extractPage(PDFDocument, src, 0);
    const reloaded = await PDFDocument.load(src);
    expect(reloaded.getPageCount()).toBe(3);
  });

  it("falla si el índice está fuera de rango", async () => {
    const src = await makePdf(2);
    await expect(extractPage(PDFDocument, src, 9)).rejects.toThrow();
  });
});
