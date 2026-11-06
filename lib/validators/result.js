// Forma común del resultado de cualquier validador:
//   { valid: boolean, errors: ValidationError[], meta: {} }
//   ValidationError = { message, line, column, offset, hint }
//   Algunos validadores añaden, solo cuando aplican, campos opcionales: `path` (JSON
//   Pointer del dato, p. ej. "/usuarios/0/email"), `source` ("document" o "schema":
//   en qué texto está el error), `params` (valores para la pista) y `value` (en los
//   validadores de lista, el valor de esa línea que falla).
//
// - `message`: descripción técnica en inglés (la del motor, ya sin la posición).
// - `line`/`column`/`offset`: null cuando no se conocen; nunca se inventan.
// - `hint`: clave i18n de una pista para no técnicos (p. ej. "trailingComma"),
//   o null. La librería no lleva textos de idioma: la UI traduce la clave.

/** Resultado válido. `meta` son datos opcionales (tipo raíz, nº de claves…). */
export const ok = (meta = {}) => ({ valid: true, errors: [], meta });

/** Resultado inválido con una lista de errores. */
export const fail = (errors, meta = {}) => ({ valid: false, errors, meta });

/**
 * Error con la forma común; lo que no se pasa queda en null. `path`, `source`,
 * `params` y `value` solo aparecen si se pasan, para no alterar la forma de los demás validadores.
 */
export const makeError = (message, { line = null, column = null, offset = null, hint = null, path, source, params, value } = {}) => ({
  message,
  line,
  column,
  offset,
  hint,
  ...(path !== undefined && { path }),
  ...(source !== undefined && { source }),
  ...(params !== undefined && { params }),
  ...(value !== undefined && { value }),
});
