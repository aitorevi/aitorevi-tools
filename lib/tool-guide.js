// Renderiza una "chuleta"/guía de referencia dentro de `host`, combinando una
// estructura de grupos (símbolos universales) con sus textos i18n. Reutilizable
// por cualquier herramienta (regex, JWT, …).
//
// groups: [{ name, rows: [[symbol, descKey], …] }]
// g (i18n): { title, intro, groups: { <name>: label }, desc: { <descKey>: texto } }
const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

export function renderGuide(host, groups, g) {
  if (!host || !g) return;
  const cols = groups
    .map((group) => {
      const rows = group.rows
        .map(
          ([symbol, key]) =>
            `<dt><code>${esc(symbol)}</code></dt><dd>${esc((g.desc && g.desc[key]) || key)}</dd>`
        )
        .join("");
      return `<div class="tool-guide-group">
          <h3>${esc((g.groups && g.groups[group.name]) || group.name)}</h3>
          <dl>${rows}</dl>
        </div>`;
    })
    .join("");
  host.innerHTML = `<h2 class="tool-guide-title">${esc(g.title)}</h2>
      <p class="tool-guide-intro">${esc(g.intro)}</p>
      <div class="tool-guide-grid">${cols}</div>`;
}
