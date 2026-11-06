// Servidor estático de desarrollo con anti-caché (no-store) para evitar que el
// navegador sirva versiones antiguas de app.js mientras iteramos. Solo dev.
import { createServer } from "http";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { extname, join, normalize } from "path";

const ROOT = new URL(".", import.meta.url).pathname;
const PORT = 8099;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

// Aplica las cabeceras de seguridad de vercel.json (CSP incluida) para que dev y
// e2e ejecuten con la misma política que producción. Cache-Control se ignora:
// en dev manda el anti-caché.
const HEADER_RULES = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")).headers.map((r) => ({
  re: new RegExp(`^${r.source}$`),
  headers: r.headers.filter((h) => h.key.toLowerCase() !== "cache-control"),
}));
const securityHeaders = (path) =>
  Object.fromEntries(HEADER_RULES.filter((r) => r.re.test(path)).flatMap((r) => r.headers.map((h) => [h.key, h.value])));

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html"; // "/" y "/separar-pdf/" → index.html
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      ...securityHeaders(path),
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`Dev server (no-cache) en http://localhost:${PORT}`));
