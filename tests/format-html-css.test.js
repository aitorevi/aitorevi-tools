import { describe, it, expect } from "vitest";
import { format, looksLikeHtml, SAMPLE } from "../formatear-html-css/lib.js";
import { loadUMD } from "./_umd.js";

const beautifier = loadUMD("vendor/js-beautify.min.js", "beautifier");

describe("looksLikeHtml", () => {
  it("detecta markup por el '<' inicial", () => {
    expect(looksLikeHtml("<div></div>")).toBe(true);
    expect(looksLikeHtml("  \n <p>x")).toBe(true);
    expect(looksLikeHtml(".a { color: red }")).toBe(false);
    expect(looksLikeHtml("/* css */ a{}")).toBe(false);
  });
});

describe("format", () => {
  it("embellece HTML con sangría de 2 espacios", () => {
    const out = format("<ul><li>a</li><li>b</li></ul>", beautifier);
    expect(out).toContain("<ul>");
    expect(out).toMatch(/\n {2}<li>a<\/li>/);
  });

  it("embellece CSS cuando no empieza por '<'", () => {
    const out = format(".a{color:red;margin:0}", beautifier);
    expect(out).toMatch(/\.a \{/);
    expect(out).toMatch(/\n {2}color: red;/);
  });

  it("es idempotente: format(format(x)) === format(x)", () => {
    const once = format(SAMPLE, beautifier);
    expect(format(once, beautifier)).toBe(once);
  });

  it("lanza un error controlado con entrada vacía", () => {
    expect(() => format("   ", beautifier)).toThrow();
  });

  it("el SAMPLE es HTML y se formatea sin lanzar", () => {
    expect(looksLikeHtml(SAMPLE)).toBe(true);
    expect(() => format(SAMPLE, beautifier)).not.toThrow();
  });
});
