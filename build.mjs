#!/usr/bin/env node
/**
 * Generador estático de aitorevi.tools.
 *
 * Fuente única: tools.json + partials/ + <slug>/body.html
 * Salida (commiteada, servida tal cual por Vercel): <slug>/index.html, index.html, sitemap.xml
 *
 * Regla de oro: el HTML generado NO se edita a mano. Edita el origen y ejecuta `npm run build`.
 * Sin dependencias: solo Node estándar.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ORIGIN = "https://tools.aitorevi.dev";

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const write = (p, s) => writeFileSync(join(ROOT, p), s.endsWith("\n") ? s : s + "\n");

const registry = JSON.parse(read("tools.json"));
const NAVBAR = read("partials/navbar.html").replace(/\s+$/, "");
const FOOT_SOCIAL = read("partials/foot-social.html").replace(/\s+$/, "");
const MIT = read("partials/license-mit.txt").replace(/\s+$/, "");

// --- helpers de librerías ----------------------------------------------------

const hasLib = (tool, lib) => (tool.libs || []).includes(lib);

function footLine(tool) {
  if (hasLib(tool, "pdf-lib") && hasLib(tool, "jszip"))
    return "Hecho con pdf-lib + JSZip · sin servidor, sin subidas";
  if (hasLib(tool, "pdf-lib")) return "Hecho con pdf-lib · sin servidor, sin subidas";
  return "100% en tu navegador · sin servidor, sin subidas";
}

function footLegal(tool) {
  if (hasLib(tool, "pdf-lib") && hasLib(tool, "jszip"))
    return "pdf-lib y JSZip se usan bajo licencia MIT. Esta herramienta se ofrece tal cual, sin garantías. Tus archivos se procesan íntegramente en tu navegador y no se envían a ningún servidor.";
  if (hasLib(tool, "pdf-lib"))
    return "pdf-lib se usa bajo licencia MIT. Esta herramienta se ofrece tal cual, sin garantías. Tus archivos se procesan íntegramente en tu navegador y no se envían a ningún servidor.";
  return "Esta herramienta se ofrece tal cual, sin garantías. Tus imágenes se procesan íntegramente en tu navegador y no se envían a ningún servidor.";
}

function licensesBlock(tool) {
  if (!hasLib(tool, "pdf-lib")) return "";
  const entries = [
    "        <p><strong>pdf-lib</strong> — Copyright (c) 2019 Andrew Dillon</p>",
  ];
  if (hasLib(tool, "jszip")) {
    entries.push(
      "        <p><strong>JSZip</strong> — Copyright (c) 2009-2016 Stuart Knightley, David Duponchel,\n          Franz Buchinger, António Afonso · usada bajo MIT (licencia dual MIT/GPLv3)</p>"
    );
  }
  const distributed = hasLib(tool, "jszip")
    ? "Ambas se distribuyen bajo los términos de la licencia MIT:"
    : "Se distribuye bajo los términos de la licencia MIT:";
  return `
    <details class="licenses">
      <summary>Licencias</summary>
      <div class="license-body">
${entries.join("\n")}
        <p>${distributed}</p>
        <pre>${MIT}</pre>
      </div>
    </details>
`;
}

function scripts(tool) {
  const lines = [];
  if (hasLib(tool, "pdf-lib")) lines.push('  <script src="/vendor/pdf-lib.min.js"></script>');
  if (hasLib(tool, "jszip")) lines.push('  <script src="/vendor/jszip.min.js"></script>');
  lines.push(`  <script type="module" src="/${tool.slug}/app.js"></script>`);
  return lines.join("\n");
}

// --- bloques HTML compartidos ------------------------------------------------

function jsonLdSoftware(tool) {
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "${tool.jsonldName}",
    "url": "${ORIGIN}/${tool.slug}/",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "inLanguage": "es",
    "description": "${tool.jsonldDescription}",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
    "author": { "@type": "Person", "name": "Aitor Reviriego", "url": "https://www.aitorevi.dev" }
  }
  </script>`;
}

function jsonLdWebsite(hub) {
  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "aitorevi.tools",
    "url": "${ORIGIN}/",
    "inLanguage": "es",
    "description": "${hub.jsonldDescription}",
    "author": { "@type": "Person", "name": "Aitor Reviriego", "url": "https://www.aitorevi.dev" }
  }
  </script>`;
}

/** Cabecera común. `extraMeta`, `jsonld` y `style` ya vienen formateados (o vacíos). */
function head({ title, description, canonical, ogTitle, ogDescription, extraMeta = "", jsonld, style = "" }) {
  const styleBlock = style ? `\n\n${style}` : "";
  const extra = extraMeta ? `${extraMeta}\n` : "";
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
${extra}  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" href="${canonical}" />
  <meta name="color-scheme" content="dark light" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="aitorevi.tools" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ORIGIN}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="stylesheet" href="/styles.css" />
  <script src="/theme.js"></script>
${jsonld}${styleBlock}
</head>`;
}

/** Pie común. `footNav` es el bloque de enlaces; `legal`/`licenses` van vacíos en el hub. */
function footer({ line, nav, legal = "", licenses = "" }) {
  const legalBlock = legal
    ? `\n    <p class="foot-legal">\n      ${legal}\n    </p>\n`
    : "";
  return `  <footer class="site-footer">
${FOOT_SOCIAL}

    <p class="foot-line">${line}</p>

    <nav class="foot-nav" aria-label="Enlaces del pie">
${nav}
    </nav>
${legalBlock}${licenses}    <p class="foot-copy">© 2026 aitorevi · tools.aitorevi.dev</p>
  </footer>`;
}

const TOOL_FOOT_NAV = `      <a href="/">aitorevi.tools</a>
      <span class="sep" aria-hidden="true">·</span>
      <a href="https://www.aitorevi.dev/work/tools" target="_blank" rel="noopener">Sobre estas herramientas</a>`;

const HUB_FOOT_NAV = `      <a href="https://www.aitorevi.dev" target="_blank" rel="noopener">aitorevi.dev</a>
      <span class="sep" aria-hidden="true">·</span>
      <a href="https://www.aitorevi.dev/work" target="_blank" rel="noopener">Proyectos</a>
      <span class="sep" aria-hidden="true">·</span>
      <a href="https://www.aitorevi.dev/blog" target="_blank" rel="noopener">Blog</a>`;

/** Separa un <style> inicial (que va al <head>) del resto del cuerpo (el <main>). */
function splitBody(raw) {
  const trimmed = raw.replace(/^﻿/, "").trimStart();
  const m = trimmed.match(/^(<style>[\s\S]*?<\/style>)\s*([\s\S]*)$/);
  if (m) return { style: m[1], main: m[2].trimEnd() };
  return { style: "", main: trimmed.trimEnd() };
}

function page({ head: headHtml, main, footerHtml, scriptsHtml = "" }) {
  const scriptBlock = scriptsHtml ? `\n\n${scriptsHtml}` : "";
  return `<!DOCTYPE html>
<html lang="es">
${headHtml}
<body>
${NAVBAR}

${main}

${footerHtml}${scriptBlock}
</body>
</html>`;
}

// --- generación --------------------------------------------------------------

function buildTool(tool) {
  const canonical = `${ORIGIN}/${tool.slug}/`;
  const { style, main } = splitBody(read(`${tool.slug}/body.html`));
  const html = page({
    head: head({
      title: tool.title,
      description: tool.description,
      canonical,
      ogTitle: tool.ogTitle,
      ogDescription: tool.ogDescription,
      jsonld: jsonLdSoftware(tool),
      style,
    }),
    main,
    footerHtml: footer({
      line: footLine(tool),
      nav: TOOL_FOOT_NAV,
      legal: footLegal(tool),
      licenses: licensesBlock(tool),
    }),
    scriptsHtml: scripts(tool),
  });
  write(`${tool.slug}/index.html`, html);
}

function hubCard(tool) {
  const tags = tool.card.tags.map((t) => `<span>${t}</span>`).join("");
  return `        <a class="tool-card" href="/${tool.slug}/">
          <h3 class="tool-name">${tool.card.name}</h3>
          <p class="tool-desc">${tool.card.desc}</p>
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

function buildHub() {
  const hub = registry.site.hub;
  const sectionsHtml = registry.sections
    .map((section) => {
      const cards = registry.tools
        .filter((t) => t.section === section.id)
        .map(hubCard);
      if (hub.soonCard && hub.soonCard.section === section.id) cards.push(soonCard(hub.soonCard));
      return `    <section class="tools-section" aria-labelledby="${section.anchor}">
      <h2 class="section-title" id="${section.anchor}"><span class="dot" aria-hidden="true"></span>${section.label}</h2>
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

  const html = page({
    head: head({
      title: hub.title,
      description: hub.description,
      canonical: `${ORIGIN}/`,
      ogTitle: hub.ogTitle,
      ogDescription: hub.ogDescription,
      extraMeta: `  <meta name="google-site-verification" content="${registry.site.googleVerification}" />`,
      jsonld: jsonLdWebsite(hub),
      style: read("partials/hub-style.html").replace(/\s+$/, ""),
    }),
    main,
    footerHtml: footer({ line: hub.footLine, nav: HUB_FOOT_NAV }),
  });
  write("index.html", html);
}

function buildSitemap() {
  const urls = [
    { loc: `${ORIGIN}/`, priority: "0.8" },
    ...registry.tools.map((t) => ({ loc: `${ORIGIN}/${t.slug}/`, priority: "1.0" })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
}

// --- run ---------------------------------------------------------------------

let count = 0;
for (const tool of registry.tools) {
  buildTool(tool);
  count++;
}
buildHub();
buildSitemap();

// Guardas: ningún placeholder sin resolver en la salida.
const outputs = ["index.html", "sitemap.xml", ...registry.tools.map((t) => `${t.slug}/index.html`)];
const leftover = outputs.filter((p) => /\{\{|\}\}/.test(read(p)));
if (leftover.length) {
  console.error(`✗ placeholders sin resolver en: ${leftover.join(", ")}`);
  process.exit(1);
}

console.log(`✓ build OK — ${count} tools + hub + sitemap (${outputs.length} ficheros)`);
