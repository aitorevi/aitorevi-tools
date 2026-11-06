import { test, expect } from "./fixtures.mjs";
import { auditNetwork } from "./helpers/network.mjs";

// Prueba el validador de XML contra el DOMParser REAL del navegador (Chromium en
// CI). jsdom/happy-dom darían otro formato de <parsererror>, así que no valdrían.
// Se ejecuta en Chromium, Firefox y WebKit; sus formatos también están como fixtures
// en tests/validators-xml.

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try { localStorage.setItem("lang", "es"); } catch {}
  });
});

async function validateInPage(page, text) {
  return page.evaluate(async (t) => {
    const { validateXml } = await import("/lib/validators/xml.js");
    return validateXml(t);
  }, text);
}

// Cada motor da su propio mensaje y su propia posición para el mismo XML, así que lo
// esperado va por motor (valores contrastados con los DOMParser reales). Todos cuentan
// columnas en puntos de código; la columna que se devuelve ya es UTF-16, como el editor.
// [texto, { chromium: [offset, línea, columna, pista], webkit?, firefox? }]
// WebKit comparte formato con Chromium (libxml2): solo se indica donde difiere.
const INVALID = [
  ["<a><b></a>", { chromium: [10, 1, 11, "mismatchedTag"], firefox: [8, 1, 9, "mismatchedTag"] }],
  // WebKit da «Extra content» y Firefox «no root element»: la pista se afina a unclosedTag.
  ["<a><b>", { chromium: [6, 1, 7, "unclosedTag"], firefox: [6, 1, 7, "unclosedTag"] }],
  ["hola", { chromium: [0, 1, 1, "noRoot"], firefox: [0, 1, 1, "noRoot"] }],
  // Firefox da solo «not well-formed»: la pista sale del carácter anterior al error.
  ["<a>fish & chips</a>", { chromium: [9, 1, 10, "unescapedAmpersand"], firefox: [9, 1, 10, "unescapedAmpersand"] }],
  ["<a>&nbsp;</a>", { chromium: [9, 1, 10, "undefinedEntity"], firefox: [3, 1, 4, "undefinedEntity"] }],
  ["<a b=1/>", { chromium: [5, 1, 6, "attributeQuotes"], firefox: [5, 1, 6, "attributeQuotes"] }],
  ['<a b="1" b="2"/>', { chromium: [14, 1, 15, "duplicateAttribute"], firefox: [9, 1, 10, "duplicateAttribute"] }],
  [' <?xml version="1.0"?><a/>', { chromium: [6, 1, 7, "declPosition"], firefox: [1, 1, 2, "declPosition"] }],
  ["<a>1 < 2</a>", { chromium: [6, 1, 7, "unescapedLt"], firefox: [6, 1, 7, "unescapedLt"] }],
  ["<root>\n  <a>\n    <b></c>\n  </a>\n</root>", { chromium: [24, 3, 12, "mismatchedTag"], firefox: [22, 3, 10, "mismatchedTag"] }],
  // Un emoji ocupa 1 columna para el motor y 2 en UTF-16 (los tres cuentan puntos de código).
  ["<a>ñ😀</a><b/>", { chromium: [10, 1, 11, "extraContent"], firefox: [10, 1, 11, "extraContent"] }],
  ["\ufeff<a><b></a>", { chromium: [11, 1, 12, "mismatchedTag"], firefox: [9, 1, 10, "mismatchedTag"] }],
];

for (const [text, byEngine] of INVALID) {
  test(`xml real: ${JSON.stringify(text)}`, async ({ page, browserName }) => {
    const [offset, line, column, hint] = byEngine[browserName] || byEngine.chromium; // webkit = formato de chromium
    await page.goto("/");
    const r = await validateInPage(page, text);
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0], `${browserName}`).toMatchObject({ offset, line, column, hint });
    expect(r.errors[0].message.length).toBeGreaterThan(0);
  });
}

const VALID = [
  ["<a><b/></a>", { rootName: "a", elementCount: 2, attributeCount: 0, depth: 2 }],
  ['<a x="1"><b y="2" z="3"><c/></b></a>', { rootName: "a", elementCount: 3, attributeCount: 3, depth: 3 }],
  ['<ns:a xmlns:ns="urn:x"><ns:b/></ns:a>', { rootName: "ns:a", elementCount: 2, attributeCount: 1, depth: 2 }],
  // Un <parsererror> escrito por el usuario es XML válido, no un error del motor.
  ["<parsererror>real element</parsererror>", { rootName: "parsererror", elementCount: 1, attributeCount: 0, depth: 1 }],
  ['<?xml version="1.0" encoding="UTF-8"?><!-- c --><a><![CDATA[<&>]]></a>', { rootName: "a", elementCount: 1, attributeCount: 0, depth: 1 }],
  ['<!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>', { rootName: "a", elementCount: 1, attributeCount: 0, depth: 1 }],
  ["﻿<a/>", { rootName: "a", elementCount: 1, attributeCount: 0, depth: 1, hadBom: true }],
];

for (const [text, meta] of VALID) {
  test(`xml real: válido ${JSON.stringify(text).slice(0, 50)}`, async ({ page }) => {
    await page.goto("/");
    const r = await validateInPage(page, text);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.meta).toMatchObject(meta);
  });
}

test("xml real: entrada vacía no llega al parser", async ({ page }) => {
  await page.goto("/");
  const r = await validateInPage(page, "  \n ");
  expect(r.errors[0]).toMatchObject({ hint: "empty", offset: null });
});

test("xml real: un DTD externo no provoca ninguna petición de red", async ({ page, context, baseURL }) => {
  const net = auditNetwork(context, new URL(baseURL).origin);
  await page.goto("/", { waitUntil: "networkidle" });
  const afterLoad = net.requests().length;
  const r = await validateInPage(page, '<!DOCTYPE a SYSTEM "https://example.com/x.dtd"><a/>');
  await page.evaluate(() => new Promise((res) => setTimeout(res, 500)));
  expect(r.valid).toBe(true);
  // Lo único que se pide tras la carga son los módulos propios; nada del DTD externo.
  const after = net.requests().slice(afterLoad);
  expect(after.filter((u) => !u.startsWith(`${new URL(baseURL).origin}/lib/`))).toEqual([]);
  expect(net.requests().some((u) => u.includes("example.com"))).toBe(false);
  expect(net.violations()).toEqual([]);
});
