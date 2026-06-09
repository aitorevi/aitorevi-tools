import { describe, it, expect } from "vitest";
import {
  stripJpegMetadata,
  stripPngMetadata,
  stripMetadata,
  cleanedFileName,
} from "../quitar-metadatos-imagen/lib.js";

const has = (bytes, needle) => {
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let k = 0; k < needle.length; k++) if (bytes[i + k] !== needle[k]) continue outer;
    return true;
  }
  return false;
};

// JPEG sintético: SOI + APP0(JFIF) + APP1(Exif) + SOS+datos + EOI
function buildJpeg() {
  const app0 = [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]; // "JFIF" + datos
  const app1 = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 1, 2, 3, 4, 5, 6, 7, 8]; // "Exif" + payload
  const bytes = [0xff, 0xd8];
  bytes.push(0xff, 0xe0, ((app0.length + 2) >> 8) & 0xff, (app0.length + 2) & 0xff, ...app0);
  bytes.push(0xff, 0xe1, ((app1.length + 2) >> 8) & 0xff, (app1.length + 2) & 0xff, ...app1);
  bytes.push(0xff, 0xda, 0x00, 0x08, 1, 0, 0, 0, 0x3f, 0); // SOS (cabecera dummy)
  bytes.push(0xaa, 0xbb, 0xcc, 0xff, 0xd9); // datos de imagen + EOI
  return Uint8Array.from(bytes);
}

describe("stripJpegMetadata", () => {
  const original = buildJpeg();
  const cleaned = stripJpegMetadata(original);

  it("elimina el segmento Exif (APP1)", () => {
    expect(has(original, [0x45, 0x78, 0x69, 0x66])).toBe(true); // "Exif" en el original
    expect(has(cleaned, [0x45, 0x78, 0x69, 0x66])).toBe(false); // ya no
    expect(cleaned.length).toBeLessThan(original.length);
  });
  it("conserva JFIF (APP0) y los datos de imagen", () => {
    expect(has(cleaned, [0x4a, 0x46, 0x49, 0x46])).toBe(true); // "JFIF"
    expect(has(cleaned, [0xaa, 0xbb, 0xcc])).toBe(true); // scan data
    expect(cleaned[0]).toBe(0xff);
    expect(cleaned[1]).toBe(0xd8); // sigue siendo JPEG
  });
  it("lanza si no es JPEG", () => {
    expect(() => stripJpegMetadata(Uint8Array.from([1, 2, 3]))).toThrow();
  });
});

// PNG sintético: firma + IHDR + tEXt + IDAT + IEND
function buildPng() {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type, data) => {
    const len = data.length;
    return [
      (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255,
      ...[...type].map((c) => c.charCodeAt(0)),
      ...data,
      0, 0, 0, 0, // CRC dummy
    ];
  };
  return Uint8Array.from([
    ...sig,
    ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
    ...chunk("tEXt", [65, 66, 67]), // "ABC"
    ...chunk("IDAT", [1, 2, 3]),
    ...chunk("IEND", []),
  ]);
}

describe("stripPngMetadata", () => {
  const original = buildPng();
  const cleaned = stripPngMetadata(original);

  it("elimina el chunk tEXt", () => {
    expect(has(original, [65, 66, 67])).toBe(true);
    expect(has(cleaned, [65, 66, 67])).toBe(false);
    expect(cleaned.length).toBeLessThan(original.length);
  });
  it("conserva IDAT", () => {
    expect(has(cleaned, [1, 2, 3])).toBe(true);
  });
});

describe("stripMetadata", () => {
  it("detecta JPEG y devuelve removed > 0", () => {
    const { bytes, removed } = stripMetadata(buildJpeg(), "image/jpeg");
    expect(removed).toBeGreaterThan(0);
    expect(bytes.length).toBeGreaterThan(0);
  });
  it("detecta PNG por firma aunque no se pase el tipo", () => {
    const { removed } = stripMetadata(buildPng());
    expect(removed).toBeGreaterThan(0);
  });
  it("lanza con formatos no soportados", () => {
    expect(() => stripMetadata(Uint8Array.from([1, 2, 3, 4]), "image/gif")).toThrow();
  });
});

describe("cleanedFileName", () => {
  it("añade el sufijo", () => {
    expect(cleanedFileName("foto", "jpg")).toBe("foto-sin-metadatos.jpg");
  });
});
