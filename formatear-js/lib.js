// Formatear JavaScript / TypeScript — lógica pura (sin DOM), testeable con Vitest.
// Usa Prettier standalone vendorizado, recibido por inyección (DI): en el
// navegador es window.prettierTool (bundle con .formatCode async) y en los tests
// se carga el mismo bundle. format es ASÍNCRONO.

/**
 * Embellece código JS o TS con Prettier.
 * @param {string} code
 * @param {{ formatCode: (code: string, parser: string) => Promise<string> }} prettierTool
 * @param {string} [parser="babel"]  "babel" (JS/JSX) | "typescript"
 * @returns {Promise<string>}
 */
export async function format(code, prettierTool, parser = "babel") {
  const text = String(code == null ? "" : code);
  if (text.trim() === "") throw new Error("El código está vacío.");
  const out = await prettierTool.formatCode(text, parser === "typescript" ? "typescript" : "babel");
  return out.replace(/\n$/, "");
}

/** Lenguajes ofrecidos en el desplegable (parser de Prettier). */
export const PARSERS = [
  { value: "babel", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
];

/** Ejemplo para precargar en la entrada: JS desordenado que mejora al formatear. */
export const SAMPLE =
  "const greet=(name)=>{return 'hola '+name}\nconst doubled=[1,2,3].map(n=>n*2).filter( n=>n>2 )\nfunction sum(a,b){return a+b}";
