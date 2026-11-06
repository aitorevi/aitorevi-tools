import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Solo tests unitarios/integración en tests/. Los E2E (e2e/) los corre Playwright.
    include: ["tests/**/*.test.js"],
    environment: "node",
    coverage: {
      provider: "v8",
      // Lógica pura: lo que corre en Node. La UI con DOM (app.js, lib/*-tool.js…) la
      // cubren los e2e con navegador real, así que no cuenta aquí.
      include: ["lib/**/*.js", "*/lib.js", "validar-*/schema-client.js"],
      exclude: [
        "lib/*-tool.js", "lib/copy-button.js", "lib/dropzone.js", "lib/wrap-toggle.js", "lib/i18n.js",
        "lib/tool-guide.js", "lib/files.js",
      ],
      reporter: ["text"],
      // Suelo de cobertura de la lógica de validación (hoy ~99 %): si baja, `npm run test:coverage` falla.
      thresholds: {
        "lib/validators/**": { statements: 98, branches: 95, functions: 100, lines: 98 },
        "validar-json/schema-client.js": { statements: 100, functions: 100, lines: 100, branches: 90 },
      },
    },
  },
});
