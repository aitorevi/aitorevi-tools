// Validar XML — datos puros de la herramienta (sin DOM).
// La validación vive en lib/validators/xml.js y la UI en lib/validate-tool.js.

/** Ejemplo para "Probar ejemplo": una etiqueta que se cierra con otro nombre (línea 4). */
export const SAMPLE =
  '<catalogo>\n  <libro id="1">\n    <titulo>Clean Code</titulo>\n  </libros>\n</catalogo>';
