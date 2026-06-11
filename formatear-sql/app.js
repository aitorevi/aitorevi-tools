// Formatear SQL — cableado del DOM. La lógica pura vive en ./lib.js y la UI
// común en ../lib/code-tool.js. El formateador (sql-formatter) llega como global
// del UMD vendorizado (window.sqlFormatter) y se inyecta en format.
import { format, DIALECTS, SAMPLE } from "./lib.js";
import { mountCodeTool } from "../lib/code-tool.js";

mountCodeTool({
  mount: "#code-tool",
  toolId: "formatear-sql",
  format: (sql, dialect) => format(sql, window.sqlFormatter, dialect),
  sample: SAMPLE,
  select: { labelKey: "codeDialect", choices: DIALECTS, value: "sql" },
});
