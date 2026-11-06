import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

// La CSP es lo que garantiza, en el navegador, que ningún script pueda sacar datos ni
// ejecutar código generado. Se evalúa con las mismas reglas que Vercel y serve.mjs
// (cada `source` como expresión regular) sobre TODAS las páginas publicadas.
const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const vercel = JSON.parse(read("vercel.json"));
const registry = JSON.parse(read("tools.json"));
const rules = vercel.headers.map((r) => ({ re: new RegExp(`^${r.source}$`), headers: r.headers }));
const cspFor = (path) => rules.filter((r) => r.re.test(path)).flatMap((r) => r.headers).filter((h) => h.key === "Content-Security-Policy").map((h) => h.value);
const directive = (csp, name) => (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || "").slice(name.length + 1).split(/\s+/).filter(Boolean);

const PAGES = ["/", "/en/", "/licencias/", "/en/licenses/"];
for (const t of registry.tools) PAGES.push(`/${t.slug.es}/`, `/en/${t.slug.en}/`);
// Solo estos recursos necesitan compilar WebAssembly (decoder HEIC y su worker).
const WASM_PATHS = ["/convertir-imagen/heic-worker.js", "/vendor/heic-converter/index.mjs", "/vendor/heic-converter/worker-x.mjs"];

describe("CSP de las páginas", () => {
  it("se comprueban todas las páginas publicadas", () => expect(PAGES.length).toBe(registry.tools.length * 2 + 4));

  for (const path of PAGES) {
    it(`${path}: una sola CSP, sin eval y sin red`, () => {
      const all = cspFor(path);
      expect(all, "debe aplicarse exactamente una CSP").toHaveLength(1);
      const csp = all[0];
      expect(directive(csp, "default-src")).toEqual(["'self'"]);
      expect(directive(csp, "script-src")).toEqual(["'self'"]); // sin 'unsafe-eval', 'unsafe-inline' ni 'wasm-unsafe-eval'
      expect(directive(csp, "connect-src")).toEqual(["'self'"]);
      expect(directive(csp, "worker-src")).toEqual(["'self'"]);
      expect(directive(csp, "object-src")).toEqual(["'none'"]);
      expect(directive(csp, "base-uri")).toEqual(["'none'"]);
      expect(directive(csp, "form-action")).toEqual(["'none'"]);
      expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
      expect(csp).not.toMatch(/unsafe-eval/);
    });
  }
});

describe("CSP de los recursos que compilan WebAssembly", () => {
  for (const path of WASM_PATHS) {
    it(`${path}: permite compilar WASM pero nada más`, () => {
      const all = cspFor(path);
      expect(all, "debe aplicarse exactamente una CSP").toHaveLength(1);
      expect(directive(all[0], "script-src")).toEqual(["'self'", "'wasm-unsafe-eval'"]);
      expect(directive(all[0], "connect-src")).toEqual(["'self'"]);
      expect(all[0]).not.toMatch(/(?<!wasm-)unsafe-eval/);
    });
  }

  it("el worker de schema y el resto de scripts propios NO tienen permiso de WASM", () => {
    for (const path of ["/validar-json/schema-worker.js", "/lib/validate-tool.js", "/vendor/json-schema.min.js", "/vendor/js-yaml.min.js"]) {
      expect(directive(cspFor(path)[0], "script-src"), path).toEqual(["'self'"]);
    }
  });
});

describe("otras cabeceras de seguridad", () => {
  it("todas las páginas llevan nosniff, X-Frame-Options y Referrer-Policy", () => {
    for (const path of PAGES.slice(0, 6)) {
      const keys = rules.filter((r) => r.re.test(path)).flatMap((r) => r.headers).map((h) => h.key);
      for (const key of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) expect(keys, `${path} ${key}`).toContain(key);
    }
  });
});
