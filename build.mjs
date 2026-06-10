#!/usr/bin/env node
/**
 * Generador estático bilingüe (ES/EN) de aitorevi.tools.
 *
 * Fuente única: tools.json (estructura) + i18n/{es,en}.json (textos) + partials/
 * + <id>/body.html. Salida (commiteada, servida por Vercel): ES en la raíz, EN en /en/.
 *
 * Regla de oro: el HTML generado NO se edita a mano. Edita el origen y ejecuta `npm run build`.
 * Sin dependencias: solo Node estándar.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ORIGIN = "https://tools.aitorevi.dev";

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => {
  const fp = join(ROOT, p);
  mkdirSync(dirname(fp), { recursive: true });
  writeFileSync(fp, s.endsWith("\n") ? s : s + "\n");
};

const registry = JSON.parse(read("tools.json"));
const I18N = { es: JSON.parse(read("i18n/es.json")), en: JSON.parse(read("i18n/en.json")) };
const NAVBAR = read("partials/navbar.html").replace(/\s+$/, "");
const FOOT_SOCIAL = read("partials/foot-social.html").replace(/\s+$/, "");
const MIT = read("partials/license-mit.txt").replace(/\s+$/, "");
const OFL = read("partials/license-ofl.txt").replace(/\s+$/, "");

const LANGS = registry.site.languages;          // ["es", "en"]
const DEFAULT_LANG = registry.site.defaultLang; // "es"
const OG_LOCALE = { es: "es_ES", en: "en_US" };
const SWITCH = {
  es: { other: "en", label: "EN", aria: "View in English" },
  en: { other: "es", label: "ES", aria: "Ver en español" },
};

// --- rutas e i18n ------------------------------------------------------------

const prefix = (lang) => (lang === DEFAULT_LANG ? "" : `${lang}/`);
const toolSlug = (tool, lang) => tool.slug[lang] || tool.slug[DEFAULT_LANG];
const toolPath = (tool, lang) => `${prefix(lang)}${toolSlug(tool, lang)}/`;
const toolUrl = (tool, lang) => `${ORIGIN}/${toolPath(tool, lang)}`;
const licSlug = (lang) => I18N[lang].licenses.slug;
const licPath = (lang) => `${prefix(lang)}${licSlug(lang)}/`;
const licUrl = (lang) => `${ORIGIN}/${licPath(lang)}`;
const hubPath = (lang) => `${prefix(lang)}`;
const hubUrl = (lang) => `${ORIGIN}/${hubPath(lang)}`;

const hasLib = (tool, lib) => (tool.libs || []).includes(lib);

// --- piezas comunes ----------------------------------------------------------

function scripts(tool) {
  const lines = [];
  if (hasLib(tool, "pdf-lib")) lines.push('  <script src="/vendor/pdf-lib.min.js"></script>');
  if (hasLib(tool, "jszip")) lines.push('  <script src="/vendor/jszip.min.js"></script>');
  lines.push(`  <script type="module" src="/${tool.id}/app.js"></script>`);
  return lines.join("\n");
}

/** Enlaces hreflang para `urls` = { es, en }. */
function altLinks(urls) {
  const links = LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${urls[l]}" />`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${urls[DEFAULT_LANG]}" />`);
  return links.join("\n");
}

function jsonLdSoftware(name, url, description, lang) {
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "${name}",
    "url": "${url}",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "inLanguage": "${lang}",
    "description": "${description}",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
    "author": { "@type": "Person", "name": "Aitor Reviriego", "url": "https://www.aitorevi.dev" }
  }
  </script>`;
}

function jsonLdWebsite(description, lang) {
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "aitorevi.tools",
    "url": "${hubUrl(lang)}",
    "inLanguage": "${lang}",
    "description": "${description}",
    "author": { "@type": "Person", "name": "Aitor Reviriego", "url": "https://www.aitorevi.dev" }
  }
  </script>`;
}

/** Cabecera. `extraMeta`, `jsonld`, `alternates` y `style` ya vienen formateados o vacíos. */
function head({ lang, title, description, canonical, ogTitle, ogDescription, alternates, extraMeta = "", jsonld, style = "" }) {
  const styleBlock = style ? `\n\n${style}` : "";
  const extra = extraMeta ? `${extraMeta}\n` : "";
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
${extra}  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" href="${canonical}" />
${alternates}
  <meta name="color-scheme" content="dark light" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="aitorevi.tools" />
  <meta property="og:locale" content="${OG_LOCALE[lang]}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ORIGIN}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="stylesheet" href="/styles.css" />
  <script src="/theme.js"></script>
  <script src="/lang.js"></script>
${jsonld}${styleBlock}
</head>`;
}

/** Navbar con marca al hub del idioma y selector al idioma homólogo. */
function navbar(lang, otherUrl) {
  const s = SWITCH[lang];
  const switchHtml = `        <a class="lang-switch" href="${otherUrl}" hreflang="${s.other}" aria-label="${s.aria}" data-lang-switch>${s.label}</a>`;
  return NAVBAR
    .replace('href="/" aria-label', `href="/${hubPath(lang)}" aria-label`)
    .replace("{{langSwitch}}", switchHtml);
}

/** Pie único. El tagline va en inglés en ambos idiomas; el enlace de licencias se traduce. */
function footer(lang) {
  const lc = I18N[lang].licenses;
  return `  <footer class="site-footer">
${FOOT_SOCIAL}

    <p class="foot-tagline">
      <a href="https://www.aitorevi.dev" target="_blank" rel="noopener">aitorevi.dev</a>
      <span class="sep" aria-hidden="true">·</span>
      <span>No dependencies, runs in your browser</span>
    </p>

    <p class="foot-copy">© 2026 aitorevi · tools.aitorevi.dev · <a href="/${licPath(lang)}">${lc.h1}</a></p>
  </footer>`;
}

function licenseCard(name, meta, text) {
  return `    <section class="card lic-card">
      <h2 class="lic-name">${name}</h2>
      <p class="lic-meta">${meta}</p>
      <pre class="license-text">${text}</pre>
    </section>`;
}

/** Separa un <style> inicial (que va al <head>) del resto del cuerpo (el <main>). */
function splitBody(raw) {
  const trimmed = raw.replace(/^﻿/, "").trimStart();
  const m = trimmed.match(/^(<style>[\s\S]*?<\/style>)\s*([\s\S]*)$/);
  if (m) return { style: m[1], main: m[2].trimEnd() };
  return { style: "", main: trimmed.trimEnd() };
}

/** Rellena {{t.clave}} en una plantilla con `dict[clave]`. */
function fillTemplate(str, dict) {
  return str.replace(/\{\{t\.([\w.]+)\}\}/g, (m, key) => {
    const v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
    return v == null ? m : v;
  });
}

function page({ lang, head: headHtml, navbarHtml, main, footerHtml, scriptsHtml = "" }) {
  const scriptBlock = scriptsHtml ? `\n\n${scriptsHtml}` : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
${headHtml}
<body>
${navbarHtml}

${main}

${footerHtml}${scriptBlock}
</body>
</html>`;
}

// --- generación --------------------------------------------------------------

function buildTool(tool, lang) {
  const T = I18N[lang].tools[tool.id];
  const canonical = toolUrl(tool, lang);
  const urls = Object.fromEntries(LANGS.map((l) => [l, toolUrl(tool, l)]));
  const dict = { ...I18N[lang].common, ...(T.ui || {}) };
  const raw = splitBody(read(`${tool.id}/body.html`));
  const style = fillTemplate(raw.style, dict);
  const main = fillTemplate(raw.main, dict);
  const html = page({
    lang,
    head: head({
      lang,
      title: T.meta.title,
      description: T.meta.description,
      canonical,
      ogTitle: T.meta.ogTitle,
      ogDescription: T.meta.ogDescription,
      alternates: altLinks(urls),
      jsonld: jsonLdSoftware(T.meta.jsonldName, canonical, T.meta.jsonldDescription, lang),
      style,
    }),
    navbarHtml: navbar(lang, "/" + toolPath(tool, SWITCH[lang].other)),
    main,
    footerHtml: footer(lang),
    scriptsHtml: scripts(tool),
  });
  write(toolPath(tool, lang) + "index.html", html);
}

function hubCard(tool, lang) {
  const card = I18N[lang].tools[tool.id].card;
  const tags = card.tags.map((t) => `<span>${t}</span>`).join("");
  return `        <a class="tool-card" href="/${toolPath(tool, lang)}">
          <h3 class="tool-name">${card.name}</h3>
          <p class="tool-desc">${card.desc}</p>
          <div class="tool-tags">${tags}</div>
        </a>`;
}

function soonCard(c) {
  return `        <div class="tool-card is-soon" aria-disabled="true">
          <h3 class="tool-name">${c.name}</h3>
          <p class="tool-desc">${c.desc}</p>
          <span class="tool-cta">${c.cta}</span>
        </div>`;
}

function buildHub(lang) {
  const t = I18N[lang];
  const hub = t.hub;
  const sectionsHtml = registry.sections
    .map((section) => {
      const cards = registry.tools.filter((x) => x.section === section.id).map((x) => hubCard(x, lang));
      if (registry.site.soonCard && registry.site.soonCard.section === section.id) cards.push(soonCard(hub.soonCard));
      return `    <section class="tools-section" aria-labelledby="${section.anchor}">
      <h2 class="section-title" id="${section.anchor}"><span class="dot" aria-hidden="true"></span>${t.sections[section.id]}</h2>
      <div class="tools-grid">
${cards.join("\n\n")}
      </div>
    </section>`;
    })
    .join("\n\n");

  const main = `  <main class="wrap wide">
    <header>
      <span class="badge"><span class="dot" aria-hidden="true"></span>100% en tu navegador · sin subir nada</span>
      <h1>${hub.h1}</h1>
      <p class="subtitle">${hub.subtitle}</p>
    </header>

${sectionsHtml}
  </main>`;

  const urls = Object.fromEntries(LANGS.map((l) => [l, hubUrl(l)]));
  const extraMeta = lang === DEFAULT_LANG
    ? `  <meta name="google-site-verification" content="${registry.site.googleVerification}" />`
    : "";
  const html = page({
    lang,
    head: head({
      lang,
      title: hub.title,
      description: hub.description,
      canonical: hubUrl(lang),
      ogTitle: hub.ogTitle,
      ogDescription: hub.ogDescription,
      alternates: altLinks(urls),
      extraMeta,
      jsonld: jsonLdWebsite(hub.jsonldDescription, lang),
      style: read("partials/hub-style.html").replace(/\s+$/, ""),
    }),
    navbarHtml: navbar(lang, "/" + hubPath(SWITCH[lang].other)),
    main,
    footerHtml: footer(lang),
  });
  write(hubPath(lang) + "index.html", html);
}

function buildLicenses(lang) {
  const lc = I18N[lang].licenses;
  const main = `  <main class="wrap">
    <header>
      <span class="badge"><span class="dot" aria-hidden="true"></span>${lc.badge}</span>
      <h1>${lc.h1}</h1>
      <p class="subtitle">${lc.subtitle}</p>
    </header>

    <p class="lic-disclaimer">${lc.disclaimer}</p>

${licenseCard("pdf-lib", lc.meta["pdf-lib"], MIT)}

${licenseCard("JSZip", lc.meta.jszip, MIT)}

${licenseCard("Outfit", lc.meta.outfit, OFL)}

${licenseCard("JetBrains Mono", lc.meta.jetbrains, OFL)}
  </main>`;
  const urls = Object.fromEntries(LANGS.map((l) => [l, licUrl(l)]));
  const html = page({
    lang,
    head: head({
      lang,
      title: lc.title,
      description: lc.description,
      canonical: licUrl(lang),
      ogTitle: lc.ogTitle,
      ogDescription: lc.ogDescription,
      alternates: altLinks(urls),
      jsonld: "",
    }),
    navbarHtml: navbar(lang, "/" + licPath(SWITCH[lang].other)),
    main,
    footerHtml: footer(lang),
  });
  write(licPath(lang) + "index.html", html);
}

function buildSitemap() {
  const entry = (urls) => {
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urls[l]}" />`).join("\n");
    return LANGS.map((l) => `  <url>
    <loc>${urls[l]}</loc>
${alts}
    <changefreq>monthly</changefreq>
  </url>`).join("\n");
  };
  const blocks = [
    entry(Object.fromEntries(LANGS.map((l) => [l, hubUrl(l)]))),
    ...registry.tools.map((t) => entry(Object.fromEntries(LANGS.map((l) => [l, toolUrl(t, l)])))),
    entry(Object.fromEntries(LANGS.map((l) => [l, licUrl(l)]))),
  ];
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${blocks.join("\n")}
</urlset>`);
}

/** Módulo JS con los mensajes dinámicos por idioma (los usa app.js vía lib/i18n.js). */
function buildRuntimeStrings() {
  const pick = (lang) =>
    Object.fromEntries(
      registry.tools
        .filter((t) => I18N[lang].tools[t.id] && I18N[lang].tools[t.id].msg)
        .map((t) => [t.id, I18N[lang].tools[t.id].msg])
    );
  const data = Object.fromEntries(LANGS.map((l) => [l, pick(l)]));
  write("i18n/strings.js", `// Generado por build.mjs — no editar a mano.\nexport const STRINGS = ${JSON.stringify(data, null, 2)};\n`);
}

// --- run ---------------------------------------------------------------------

const outputs = [];
for (const lang of LANGS) {
  for (const tool of registry.tools) {
    buildTool(tool, lang);
    outputs.push(toolPath(tool, lang) + "index.html");
  }
  buildHub(lang);
  outputs.push(hubPath(lang) + "index.html");
  buildLicenses(lang);
  outputs.push(licPath(lang) + "index.html");
}
buildSitemap();
outputs.push("sitemap.xml");
buildRuntimeStrings();

// Guarda: ningún placeholder sin resolver en la salida.
const leftover = outputs.filter((p) => /\{\{|\}\}/.test(read(p)));
if (leftover.length) {
  console.error(`✗ placeholders sin resolver en: ${leftover.join(", ")}`);
  process.exit(1);
}

console.log(`✓ build OK — ${LANGS.length} idiomas · ${registry.tools.length} tools + hub + licencias (${outputs.length} ficheros)`);
