import { describe, it, expect } from "vitest";
import { fitDimensions, extForMime, isImageFile, baseNameNoExt } from "../lib/images.js";
import { isLossy, convertedFileName, TARGETS, isHeicFile, inputFormatLabel, uniqueFileNames } from "../convertir-imagen/lib.js";
import { reductionPercent, compressedFileName, searchQualityForTarget } from "../comprimir-imagen/lib.js";

describe("fitDimensions", () => {
  it("no cambia si ya cabe o no hay límite", () => {
    expect(fitDimensions(800, 600, 0)).toEqual({ w: 800, h: 600 });
    expect(fitDimensions(800, 600, 1000)).toEqual({ w: 800, h: 600 });
  });
  it("escala manteniendo proporción por el lado mayor", () => {
    expect(fitDimensions(4000, 2000, 1000)).toEqual({ w: 1000, h: 500 });
    expect(fitDimensions(2000, 4000, 1000)).toEqual({ w: 500, h: 1000 });
  });
});

describe("extForMime / isImageFile / baseNameNoExt", () => {
  it("extForMime", () => {
    expect(extForMime("image/png")).toBe("png");
    expect(extForMime("image/jpeg")).toBe("jpg");
    expect(extForMime("image/webp")).toBe("webp");
  });
  it("isImageFile", () => {
    expect(isImageFile({ type: "image/png", name: "a.png" })).toBe(true);
    expect(isImageFile({ type: "", name: "a.webp" })).toBe(true);
    expect(isImageFile({ type: "application/pdf", name: "a.pdf" })).toBe(false);
  });
  it("baseNameNoExt", () => {
    expect(baseNameNoExt("foto.JPG")).toBe("foto");
    expect(baseNameNoExt("sin-extension")).toBe("sin-extension");
  });
});

describe("convertir-imagen", () => {
  it("isLossy solo para jpeg/webp", () => {
    expect(isLossy("image/jpeg")).toBe(true);
    expect(isLossy("image/webp")).toBe(true);
    expect(isLossy("image/png")).toBe(false);
  });
  it("TARGETS incluye png/jpg/webp", () => {
    expect(TARGETS.map((t) => t.ext).sort()).toEqual(["jpg", "png", "webp"]);
  });
  it("convertedFileName", () => {
    expect(convertedFileName("foto", "webp")).toBe("foto.webp");
  });
  it("isHeicFile acepta HEIC/HEIF por MIME o extensión", () => {
    expect(isHeicFile({ type: "image/heic", name: "foto" })).toBe(true);
    expect(isHeicFile({ type: "", name: "foto.HEIF" })).toBe(true);
    expect(isHeicFile({ type: "image/png", name: "foto.png" })).toBe(false);
  });
  it("inputFormatLabel", () => {
    expect(inputFormatLabel("IMG_001.heic")).toBe("HEIC");
    expect(inputFormatLabel("sin-extension")).toBe("?");
  });
  it("uniqueFileNames evita colisiones sin distinguir mayúsculas", () => {
    expect(uniqueFileNames(["foto.webp", "Foto.webp", "otra.webp", "foto.webp"]))
      .toEqual(["foto.webp", "Foto-2.webp", "otra.webp", "foto-3.webp"]);
  });
});

describe("comprimir-imagen", () => {
  it("reductionPercent", () => {
    expect(reductionPercent(1000, 250)).toBe(75);
    expect(reductionPercent(1000, 1200)).toBe(0); // no negativo
    expect(reductionPercent(0, 100)).toBe(0);
  });
  it("compressedFileName", () => {
    expect(compressedFileName("foto", "webp")).toBe("foto-comprimida.webp");
  });

  describe("searchQualityForTarget", () => {
    // tamaño proporcional a la calidad: size = quality * 1000
    const encode = async (q) => q * 1000;

    it("encuentra la mayor calidad cuyo tamaño cabe en el objetivo", async () => {
      const best = await searchQualityForTarget(encode, 500, { steps: 24 });
      expect(best).not.toBeNull();
      expect(best.size).toBeLessThanOrEqual(500);
      expect(best.quality).toBeCloseTo(0.5, 1);
    });

    it("devuelve null si ni la calidad mínima cabe", async () => {
      const best = await searchQualityForTarget(async () => 9999, 100);
      expect(best).toBeNull();
    });
  });
});
