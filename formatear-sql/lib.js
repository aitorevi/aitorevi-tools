// Formatear SQL — lógica pura (sin DOM), testeable con Vitest.
// Recibe el formateador inyectado (DI), igual que las tools de PDF reciben
// PDFDocument: en el navegador es window.sqlFormatter (UMD vendorizado) y en los
// tests se carga el mismo UMD. sql-formatter sólo embellece (no minifica).

/**
 * Embellece una sentencia SQL con sangría de 2 espacios y palabras clave en
 * mayúscula, en el dialecto indicado.
 * @param {string} sql
 * @param {{ format: Function }} sqlFormatter  librería sql-formatter vendorizada
 * @param {string} [language="sql"]  dialecto (sql, mysql, postgresql, …)
 */
export function format(sql, sqlFormatter, language = "sql") {
  const text = String(sql == null ? "" : sql);
  if (text.trim() === "") throw new Error("El SQL está vacío.");
  return sqlFormatter.format(text, {
    language: language || "sql",
    tabWidth: 2,
    keywordCase: "upper",
  });
}

/** Dialectos ofrecidos en el desplegable (etiquetas neutras de idioma). */
export const DIALECTS = [
  { value: "sql", label: "SQL" },
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "T-SQL (SQL Server)" },
  { value: "plsql", label: "PL/SQL (Oracle)" },
  { value: "bigquery", label: "BigQuery" },
];

/** Ejemplo para precargar en la entrada: consulta compacta que mejora al formatear. */
export const SAMPLE =
  "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true group by u.id, u.name having count(o.id) > 3 order by orders desc limit 10;";
