// Datos de un valor ya parseado (JSON, YAML, TOML): tipo raíz, nº de claves y
// profundidad. Lógica pura y compartida por los validadores. El recorrido es
// iterativo: un anidamiento enorme no desborda la pila.
//
// Solo cuentan como contenedores los arrays y los objetos "planos" (prototipo
// Object.prototype o nulo, como devuelve smol-toml). Las fechas y demás
// instancias de clases (Date, TomlDate…) son valores simples.

const isPlainObject = (v) => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
};

/** "null" | "array" | "object" | "date" | typeof (string, number, boolean…). */
export function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (isPlainObject(value)) return "object";
  return typeof value;
}

/**
 * @returns {{ rootType: string, keyCount: number, objectCount: number, depth: number }}
 *   keyCount: claves de todos los objetos; objectCount: nº de objetos (raíz incluida);
 *   depth: primitivo 0, contenedor vacío 1.
 */
export function describeValue(value) {
  let keyCount = 0;
  let objectCount = 0;
  let depth = 0;
  const stack = [[value, 1]];
  while (stack.length) {
    const [node, d] = stack.pop();
    if (Array.isArray(node)) {
      if (d > depth) depth = d;
      for (const item of node) stack.push([item, d + 1]);
    } else if (isPlainObject(node)) {
      if (d > depth) depth = d;
      objectCount++;
      const keys = Object.keys(node);
      keyCount += keys.length;
      for (const k of keys) stack.push([node[k], d + 1]);
    }
  }
  return { rootType: typeOf(value), keyCount, objectCount, depth };
}
