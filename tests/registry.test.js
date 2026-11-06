import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

// Coherencia del registro de herramientas (tools.json) con lo que realmente se genera y
// se publica: cada herramienta debe tener su cuerpo, sus textos en ES y EN, sus páginas,
// su entrada en el sitemap y en el hub, y cargar solo las librerías que declara.
const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const exists = (p) => existsSync(new URL(p, root));
const registry = JSON.parse(read("tools.json"));
const I18N = { es: JSON.parse(read("i18n/es.json")), en: JSON.parse(read("i18n/en.json")) };
const ORIGIN = registry.site.origin;
const pagePath = (tool, lang) => `${lang === "en" ? "en/" : ""}${tool.slug[lang]}/`;
const sitemap = read("sitemap.xml");
const hub = { es: read("index.html"), en: read("en/index.html") };

describe("tools.json", () => {
  it("los id y los slugs no se repiten", () => {
    const ids = registry.tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lang of ["es", "en"]) {
      const slugs = registry.tools.map((t) => t.slug[lang]);
      expect(new Set(slugs).size, `slugs ${lang}`).toBe(slugs.length);
    }
  });

  it("cada herramienta usa una sección y una subsección que existen y tienen nombre en ES y EN", () => {
    const sections = registry.sections.map((s) => s.id);
    for (const tool of registry.tools) {
      expect(sections, tool.id).toContain(tool.section);
      for (const lang of ["es", "en"]) {
        expect(I18N[lang].sections[tool.section], `${lang} sección ${tool.section}`).toBeTruthy();
        if (tool.subsection) expect(I18N[lang].subsections[tool.subsection], `${lang} subsección ${tool.subsection}`).toBeTruthy();
      }
    }
  });
});

for (const tool of registry.tools) {
  describe(`herramienta ${tool.id}`, () => {
    it("tiene cuerpo, y su app.js si la página lo carga", () => {
      expect(exists(tool.body || `${tool.id}/body.html`), "body").toBe(true);
      expect(exists(`${tool.id}/app.js`) || tool.id === "url", "app.js").toBe(true);
    });

    for (const lang of ["es", "en"]) {
      it(`${lang}: textos completos`, () => {
        const t = I18N[lang].tools[tool.id];
        expect(t, "entrada i18n").toBeTruthy();
        for (const k of ["title", "description", "ogTitle", "ogDescription", "jsonldName", "jsonldDescription"]) expect(t.meta[k], `meta.${k}`).toBeTruthy();
        for (const k of ["name", "desc"]) expect(t.card[k], `card.${k}`).toBeTruthy();
        expect(t.card.tags.length).toBeGreaterThan(0);
        for (const k of ["h1", "subtitle", "cardAria"]) expect(t.ui[k], `ui.${k}`).toBeTruthy();
      });

      it(`${lang}: la página generada existe y es coherente`, () => {
        const path = pagePath(tool, lang);
        expect(exists(`${path}index.html`), path).toBe(true);
        const html = read(`${path}index.html`);
        expect(html).toContain(`<html lang="${lang}">`);
        expect(html).toContain(`<title>${I18N[lang].tools[tool.id].meta.title}</title>`);
        expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/${path}" />`);
        expect(html).toContain(`hreflang="es" href="${ORIGIN}/${pagePath(tool, "es")}"`);
        expect(html).toContain(`hreflang="en" href="${ORIGIN}/${pagePath(tool, "en")}"`);
        expect(html).not.toMatch(/\{\{|\}\}/);
        if (exists(`${tool.id}/app.js`)) expect(html).toContain(`<script type="module" src="/${tool.id}/app.js"></script>`);
      });

      it(`${lang}: aparece en el sitemap y en el hub`, () => {
        expect(sitemap).toContain(`<loc>${ORIGIN}/${pagePath(tool, lang)}</loc>`);
        expect(hub[lang]).toContain(`href="/${pagePath(tool, lang)}"`);
      });
    }

    it("carga exactamente las librerías que declara, y los archivos existen", () => {
      for (const lang of ["es", "en"]) {
        const html = read(`${pagePath(tool, lang)}index.html`);
        const vendor = [...html.matchAll(/<script src="(\/vendor\/[^"]+)"><\/script>/g)].map((m) => m[1]);
        expect(vendor.length, `${lang}: <script> de vendor`).toBe((tool.libs || []).length);
        for (const src of vendor) expect(exists(src.slice(1)), src).toBe(true);
      }
    });
  });
}

describe("tools.json › related (enlaces entre herramientas)", () => {
  const withRelated = registry.tools.filter((t) => t.related);

  it("cada related apunta a una herramienta que existe, distinta de sí misma y sin repetir", () => {
    const ids = new Set(registry.tools.map((t) => t.id));
    for (const t of withRelated) {
      expect(new Set(t.related).size, t.id).toBe(t.related.length);
      for (const r of t.related) {
        expect(ids.has(r), `${t.id} → ${r}`).toBe(true);
        expect(r, t.id).not.toBe(t.id);
      }
    }
  });

  it("los enlaces son de ida y vuelta entre herramientas que se complementan", () => {
    // Un par validar ↔ formatear/codificar se enlaza en los dos sentidos; convertir-datos
    // es un destino común y no enlaza de vuelta a todas.
    for (const [a, b] of [["jwt", "validar-jwt"], ["base64", "validar-base64"], ["uuid", "validar-uuid"],
      ["formatear-json", "validar-json"], ["formatear-xml", "validar-xml"], ["formatear-yaml", "validar-yaml"],
      ["validar-nif", "validar-iban"]]) {
      const get = (id) => registry.tools.find((t) => t.id === id).related || [];
      expect(get(a), `${a} → ${b}`).toContain(b);
      expect(get(b), `${b} → ${a}`).toContain(a);
    }
  });

  for (const lang of ["es", "en"]) {
    it(`[${lang}] cada página lista sus relacionadas con el nombre de su tarjeta, y las demás no llevan el bloque`, () => {
      for (const t of registry.tools) {
        const html = read(`${pagePath(t, lang)}index.html`);
        if (!t.related) {
          expect(html, t.id).not.toContain('class="related-tools"');
          continue;
        }
        expect(html, t.id).toContain(`>${I18N[lang].common.relatedTitle}</h2>`);
        for (const r of t.related) {
          const rel = registry.tools.find((x) => x.id === r);
          expect(html, `${t.id} → ${r}`).toContain(`<li><a href="/${pagePath(rel, lang)}">${I18N[lang].tools[r].card.name}</a></li>`);
        }
      }
    });
  }
});
