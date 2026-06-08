import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Solo tests unitarios/integración en tests/. Los E2E (e2e/) los corre Playwright.
    include: ["tests/**/*.test.js"],
    environment: "node",
  },
});
