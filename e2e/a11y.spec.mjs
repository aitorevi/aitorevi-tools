import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { test, expect } from "./fixtures.mjs";

// Auditoría de accesibilidad automática (axe-core, WCAG 2.0/2.1 A y AA + buenas prácticas)
// de TODAS las páginas publicadas, en tema claro y oscuro, y de los estados dinámicos de
// los validadores (con error, válido, modo schema). axe no sustituye una revisión con
// lector de pantalla: no detecta todo (p. ej. marca como «por revisar» algunos contrastes
// sobre degradados), pero cualquier violación que sí detecta rompe el test.
const REGISTRY = JSON.parse(await readFile(new URL("../tools.json", import.meta.url), "utf8"));
const PATHS = ["/", "/en/", "/licencias/", "/en/licenses/"];
for (const t of REGISTRY.tools) PATHS.push(`/${t.slug.es}/`, `/en/${t.slug.en}/`);

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { try { localStorage.setItem("lang", "es"); } catch {} });
});

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
  await page.waitForTimeout(100);
}

async function audit(page, label) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = r.violations.map((v) => `${v.id} [${v.impact}] ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(found, `${label}: violaciones de accesibilidad`).toEqual([]);
  return r.incomplete.filter((i) => i.id === "color-contrast").length;
}

for (const path of PATHS) {
  test(`a11y: ${path} (claro y oscuro)`, async ({ page }) => {
    await page.goto(path);
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} ${theme}`);
    }
  });
}

const vj = (page) => ({
  input: page.locator('#code-tool [data-role="input"]'),
  btn: (act) => page.locator(`#code-tool [data-act="${act}"]`),
  headline: page.locator("#code-tool .validate-headline"),
  toggle: page.locator('#code-tool [data-role="mode"]'),
  schema: page.locator('#code-tool [data-role="schema-input"]'),
  items: page.locator("#code-tool .validate-errors > li"),
});

// Un JWT bien formado y caducado: el resultado válido incluye avisos.
const JWT_EXPIRED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDM2MDB9.c2lnbmF0dXJl";

for (const path of ["/validar-json/", "/validar-xml/", "/validar-yaml/", "/validar-toml/", "/validar-base64/", "/validar-jwt/", "/validar-uuid/", "/validar-nif/", "/validar-iban/", "/en/validate-json/"]) {
  test(`a11y: ${path} con error y con resultado válido`, async ({ page }) => {
    await page.goto(path);
    const t = vj(page);
    await t.btn("sample").click();
    await expect(page.locator("#code-tool .validate-status.is-invalid")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} error ${theme}`);
    }
    await t.input.fill(path.includes("xml") ? "<a/>" : path.includes("yaml") ? "a: 1" : path.includes("toml") ? "a = 1" : path.includes("base64") ? "QUJD" : path.includes("jwt") ? JWT_EXPIRED : path.includes("uuid") ? "550e8400-e29b-41d4-a716-446655440000\n00000000-0000-0000-0000-000000000000" : path.includes("nif") ? "12345678Z\nX1234567L" : path.includes("iban") ? "ES91 2100 0418 4502 0005 1332\nDE89 3704 0044 0532 0130 00" : "[1]");
    await expect(page.locator("#code-tool .validate-status.is-valid")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} válido ${theme}`);
    }
  });
}

for (const path of ["/validar-json/", "/en/validate-json/"]) {
  test(`a11y: ${path} en modo schema (errores del documento, del schema y sin errores)`, async ({ page }) => {
    await page.goto(path);
    const t = vj(page);
    await t.toggle.check();
    await t.btn("sample").click();
    await expect(t.items).toHaveCount(4);
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} schema/documento ${theme}`);
    }
    await t.schema.fill('{"type":"strin","properties":5}');
    await expect(page.locator("#code-tool .validate-error.is-schema").first()).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} schema/schema ${theme}`);
    }
    await t.schema.fill('{"type":"object"}');
    await t.input.fill("{}");
    await expect(page.locator("#code-tool .validate-status.is-valid")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      await audit(page, `${path} schema/válido ${theme}`);
    }
  });
}
