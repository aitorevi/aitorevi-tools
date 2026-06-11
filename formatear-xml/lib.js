// Formatear XML — lógica pura (sin DOM, sin librerías), testeable con Vitest.
// Es un tokenizador con pila: separa el XML en etiquetas/texto, valida el
// anidamiento (etiquetas mal cerradas o sin cerrar → Error) y reconstruye con
// sangría. Maneja atributos, nodos de texto, autocierre, comentarios, CDATA,
// la declaración <?xml?> y el DOCTYPE.
// Limitación conocida: el contenido mixto (texto + hijos en el mismo nodo) se
// reparte en líneas. Los '>' dentro de valores entrecomillados sí se respetan.

const INDENT = "  ";

/** Busca el '>' que cierra una etiqueta, ignorando los que van entre comillas. */
function tagEnd(src, start) {
  let quote = null;
  for (let j = start + 1; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return j;
    }
  }
  return -1;
}

/** Trocea el XML en tokens validando el anidamiento. Lanza si está mal formado. */
function tokenize(input) {
  const src = String(input == null ? "" : input).trim();
  if (src === "") throw new Error("El XML está vacío.");

  const tokens = [];
  const stack = [];
  let i = 0;

  while (i < src.length) {
    if (src[i] === "<") {
      if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i);
        if (end === -1) throw new Error("Comentario sin cerrar (falta '-->').");
        tokens.push({ type: "leaf", raw: src.slice(i, end + 3) });
        i = end + 3;
        continue;
      }
      if (src.startsWith("<![CDATA[", i)) {
        const end = src.indexOf("]]>", i);
        if (end === -1) throw new Error("Sección CDATA sin cerrar (falta ']]>').");
        tokens.push({ type: "leaf", raw: src.slice(i, end + 3) });
        i = end + 3;
        continue;
      }
      const end = tagEnd(src, i);
      if (end === -1) throw new Error("Etiqueta sin cerrar (falta '>').");
      const raw = src.slice(i, end + 1);

      if (raw.startsWith("<?") || raw.startsWith("<!")) {
        tokens.push({ type: "leaf", raw }); // declaración / DOCTYPE
      } else if (raw[1] === "/") {
        const name = raw.slice(2, -1).trim();
        const open = stack.pop();
        if (open !== name) {
          throw new Error(`Etiqueta mal anidada: </${name}> no cierra <${open ?? "?"}>.`);
        }
        tokens.push({ type: "close", raw });
      } else {
        const selfClose = raw.endsWith("/>");
        const name = raw.slice(1, selfClose ? -2 : -1).trim().split(/[\s/>]/)[0];
        if (!name) throw new Error("Etiqueta sin nombre.");
        if (selfClose) {
          tokens.push({ type: "leaf", raw });
        } else {
          stack.push(name);
          tokens.push({ type: "open", raw });
        }
      }
      i = end + 1;
    } else {
      const next = src.indexOf("<", i);
      const end = next === -1 ? src.length : next;
      const text = src.slice(i, end).trim();
      if (text) tokens.push({ type: "text", raw: text });
      i = end;
    }
  }

  if (stack.length) throw new Error(`Etiqueta sin cerrar: <${stack[stack.length - 1]}>.`);
  return tokens;
}

/** Embellece el XML con sangría de 2 espacios. Lanza si está mal formado. */
export function format(input) {
  const tokens = tokenize(input);
  const lines = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === "close") {
      depth = Math.max(0, depth - 1);
      lines.push(INDENT.repeat(depth) + tok.raw);
    } else if (tok.type === "open") {
      const next = tokens[i + 1];
      const after = tokens[i + 2];
      // <tag>texto</tag> en una sola línea.
      if (next && next.type === "text" && after && after.type === "close") {
        lines.push(INDENT.repeat(depth) + tok.raw + next.raw + after.raw);
        i += 2;
      } else {
        lines.push(INDENT.repeat(depth) + tok.raw);
        depth++;
      }
    } else {
      lines.push(INDENT.repeat(depth) + tok.raw);
    }
  }
  return lines.join("\n");
}

/** Minifica el XML (sin espacios entre etiquetas). Lanza si está mal formado. */
export function minify(input) {
  return tokenize(input).map((t) => t.raw).join("");
}

/** Ejemplo para precargar en la entrada: XML compacto que mejora al formatear. */
export const SAMPLE =
  '<?xml version="1.0" encoding="UTF-8"?><note priority="high"><to>Aitor</to><from>aitorevi.tools</from><tags><tag>dev</tag><tag>privacy</tag></tags><body>Funciona 100% en tu navegador</body></note>';
