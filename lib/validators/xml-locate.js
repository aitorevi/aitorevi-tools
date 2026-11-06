// Localiza la etiqueta de apertura que se quedó sin cerrar — lógica pura, sin DOM.
// Los motores de XML señalan el FINAL del texto cuando falta un cierre, que no ayuda
// en un documento largo: lo útil es la etiqueta que abrió y nunca se cerró. Este
// recorrido solo sigue la anidación (comentarios, CDATA, instrucciones, DOCTYPE y
// atributos entrecomillados incluidos); no valida nada más. El motor sigue decidiendo
// si el XML es válido: esto solo afina DÓNDE señalar, y si el texto no encaja con el
// caso esperado devuelve null para conservar la posición del motor.

/** Salta hasta el final de `close` desde `from`; -1 si no aparece. */
function skipTo(text, from, close) {
  const i = text.indexOf(close, from);
  return i === -1 ? -1 : i + close.length;
}

/**
 * Offset (UTF-16) de la etiqueta de apertura más interna sin cerrar, o null si el
 * texto no termina con etiquetas abiertas o hay un cierre que no corresponde.
 * @param {string} text
 * @returns {number|null}
 */
export function findUnclosedTag(text) {
  const stack = []; // { name, at }
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt === -1) break;
    if (text.startsWith("<!--", lt)) { i = skipTo(text, lt + 4, "-->"); if (i === -1) return null; continue; }
    if (text.startsWith("<![CDATA[", lt)) { i = skipTo(text, lt + 9, "]]>"); if (i === -1) return null; continue; }
    if (text.startsWith("<?", lt)) { i = skipTo(text, lt + 2, "?>"); if (i === -1) return null; continue; }
    if (text.startsWith("<!", lt)) { // DOCTYPE, con posible subconjunto interno entre [ ]
      let j = lt + 2;
      let depth = 0;
      for (; j < text.length; j++) {
        const c = text[j];
        if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ">" && depth <= 0) break;
      }
      if (j >= text.length) return null;
      i = j + 1;
      continue;
    }
    // Etiqueta de cierre o de apertura: se recorre hasta su `>` respetando las comillas.
    const closing = text[lt + 1] === "/";
    const nameMatch = /^[^\s/>=<"']+/.exec(text.slice(lt + (closing ? 2 : 1), lt + 202));
    if (!nameMatch) return null;
    let j = lt + 1 + (closing ? 1 : 0) + nameMatch[0].length;
    let quote = null;
    for (; j < text.length; j++) {
      const c = text[j];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
      else if (c === "<") return null; // un `<` suelto dentro de la etiqueta: otro error
    }
    // Una etiqueta de apertura que ni termina es la que falta por cerrar; un cierre
    // a medias es otro defecto y se deja al motor.
    if (j >= text.length) return closing ? null : lt;
    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== nameMatch[0]) return null;
    } else if (text[j - 1] !== "/") {
      stack.push({ name: nameMatch[0], at: lt });
    }
    i = j + 1;
  }
  return stack.length ? stack[stack.length - 1].at : null;
}
