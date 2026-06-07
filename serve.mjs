// Servidor estático de desarrollo con anti-caché (no-store) para evitar que el
// navegador sirva versiones antiguas de app.js mientras iteramos. Solo dev.
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join, normalize } from "path";

const ROOT = new URL(".", import.meta.url).pathname;
const PORT = 8099;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") path = "/index.html";
  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`Dev server (no-cache) en http://localhost:${PORT}`));
