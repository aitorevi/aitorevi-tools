// Auditoría de red para los e2e: respalda la promesa de producto "los datos del
// usuario no salen del navegador". Criterio: todas las peticiones (página y
// workers) son del mismo origen, GET, sin cuerpo y de recursos estáticos.

const STATIC = /\.(?:html|js|mjs|css|json|wasm|woff2|svg|png|ico|xml|txt)$|\/$/;

/** Empieza a registrar las peticiones de `context`. Devuelve `violations()`. */
export function auditNetwork(context, origin) {
  const seen = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "blob:" || url.protocol === "data:") return;
    seen.push({
      url: request.url(),
      sameOrigin: url.origin === origin,
      method: request.method(),
      hasBody: request.postData() != null,
      isStatic: STATIC.test(url.pathname),
    });
  });
  return {
    requests: () => seen.map((r) => r.url),
    violations: () =>
      seen
        .filter((r) => !r.sameOrigin || r.method !== "GET" || r.hasBody || !r.isStatic)
        .map((r) => `${r.method} ${r.url}${r.sameOrigin ? "" : " [otro origen]"}${r.hasBody ? " [con cuerpo]" : ""}`),
  };
}
