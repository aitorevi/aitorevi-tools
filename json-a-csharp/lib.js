// JSON → C# / TypeScript — lógica pura (sin DOM), testeable con Vitest.
// Genera clases C# o interfaces TypeScript desde un JSON con quicktype-core
// (vendorizada). Recibe la librería por inyección (DI): en el navegador es
// window.quicktypeCore (bundle UMD) y en los tests se carga el mismo bundle.
// format es ASÍNCRONO (quicktype trabaja con promesas).

// Opciones de render por lenguaje: clases/tipos limpios, sin helpers de
// (de)serialización (C# `features: just-types`, TS `just-types`).
const RENDERER_OPTIONS = {
  csharp: { features: "just-types", namespace: "Models" },
  typescript: { "just-types": "true" },
};

/**
 * Genera el código de tipos a partir de un JSON.
 * @param {string} json
 * @param {{ quicktype: Function, InputData: Function, jsonInputForTargetLanguage: Function }} quicktypeCore
 * @param {string} [lang="csharp"]  "csharp" | "typescript"
 * @returns {Promise<string>}
 */
export async function format(json, quicktypeCore, lang = "csharp") {
  const text = String(json == null ? "" : json).trim();
  if (text === "") throw new Error("El JSON está vacío.");
  JSON.parse(text); // valida que la entrada es JSON antes de generar

  const target = RENDERER_OPTIONS[lang] ? lang : "csharp";
  const { quicktype, InputData, jsonInputForTargetLanguage } = quicktypeCore;
  const jsonInput = jsonInputForTargetLanguage(target);
  await jsonInput.addSource({ name: "Root", samples: [text] });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({
    inputData,
    lang: target,
    rendererOptions: RENDERER_OPTIONS[target],
  });
  return result.lines.join("\n").replace(/\n+$/, "");
}

/** Lenguajes de salida ofrecidos en el desplegable. */
export const TARGETS = [
  { value: "csharp", label: "C#" },
  { value: "typescript", label: "TypeScript" },
];

/** Ejemplo para precargar en la entrada. */
export const SAMPLE =
  '{"id":1,"name":"aitorevi","tags":["dev","privacy"],"active":true,"profile":{"url":"https://aitorevi.dev","stars":42}}';
