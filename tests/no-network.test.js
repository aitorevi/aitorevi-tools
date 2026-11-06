import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Guardia estática de la promesa de producto: ningún dato del usuario sale del
// navegador. Complementa a la auditoría en tiempo de ejecución de los e2e y a la CSP
// (connect-src 'self'): aquí se comprueba que el código propio ni siquiera contiene APIs
// de red, y que las páginas no referencian recursos de otros orígenes.
const root = fileURLToPath(new URL("../", import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".git", "vendor", "tests", "e2e", "test-results", "playwright-report", "scripts"]);
const SKIP_FILES = new Set(["build.mjs", "serve.mjs", "playwright.config.mjs", "vitest.config.js"]);

function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, ext, out);
    else if (ext.some((e) => name.endsWith(e)) && !SKIP_FILES.has(name)) out.push(path);
  }
  return out;
}

const FORBIDDEN = [
  [/\bfetch\s*\(/, "fetch()"],
  [/XMLHttpRequest/, "XMLHttpRequest"],
  [/\bWebSocket\b/, "WebSocket"],
  [/sendBeacon/, "navigator.sendBeacon"],
  [/\bEventSource\b/, "EventSource"],
  [/\bimportScripts\s*\(/, "importScripts()"],
  [/\bimport\s*\(\s*["'`]https?:/, "import() remoto"],
  [/new\s+Worker\s*\(\s*["'`]https?:/, "Worker remoto"],
  [/\.src\s*=\s*["'`]https?:/, "recurso remoto asignado por script"],
];

describe("el código propio no usa APIs de red", () => {
  const files = walk(root, [".js", ".mjs"]);

  it("hay código que revisar", () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((f) => f.endsWith("validate-tool.js"))).toBe(true);
    expect(files.some((f) => f.endsWith("schema-worker.js"))).toBe(true);
  });

  for (const file of files) {
    it(relative(root, file), () => {
      const code = readFileSync(file, "utf8");
      const hits = FORBIDDEN.filter(([re]) => re.test(code)).map(([, name]) => name);
      expect(hits, "APIs de red encontradas").toEqual([]);
    });
  }
});

describe("las páginas no referencian recursos de otros orígenes", () => {
  const pages = walk(root, [".html"]).filter((f) => !f.includes("/partials/"));
  // Navegación (<a>) y metadatos (canonical, alternate, og:*) no descargan nada.
  const external = (url) => /^(?:https?:)?\/\//.test(url);

  it("hay páginas que revisar", () => expect(pages.length).toBeGreaterThan(50));

  for (const page of pages) {
    it(relative(root, page), () => {
      const html = readFileSync(page, "utf8");
      const bad = [];
      for (const m of html.matchAll(/<(script|img|iframe|source|video|audio|embed|object|form)\b[^>]*?\b(src|action|data)="([^"]*)"/g)) {
        if (external(m[3])) bad.push(`<${m[1]} ${m[2]}="${m[3]}">`);
      }
      for (const m of html.matchAll(/<link\b([^>]*)>/g)) {
        const rel = (m[1].match(/rel="([^"]*)"/) || [])[1] || "";
        const href = (m[1].match(/href="([^"]*)"/) || [])[1] || "";
        if (/stylesheet|icon|preload|prefetch|preconnect|dns-prefetch|modulepreload|manifest/.test(rel) && external(href)) bad.push(`<link rel="${rel}" href="${href}">`);
      }
      if (/<style[\s\S]*?(?:@import|url\(\s*["']?https?:)/i.test(html)) bad.push("<style> con @import o url() remoto");
      expect(bad, "recursos externos").toEqual([]);
    });
  }

  it("las hojas de estilo no importan nada de fuera", () => {
    for (const css of ["styles.css", "fonts/fonts.css"]) {
      expect(existsSync(join(root, css)), css).toBe(true);
      expect(readFileSync(join(root, css), "utf8"), css).not.toMatch(/@import|url\(\s*["']?(?:https?:)?\/\//);
    }
  });
});
