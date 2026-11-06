import { test, expect } from "@playwright/test";
import { auditNetwork } from "./helpers/network.mjs";

// Prueba el validador de XML contra el DOMParser REAL del navegador (Chromium en
// CI). jsdom/happy-dom darían otro formato de <parsererror>, así que no valdrían.
// Los datos esperados salen de lo que devuelve Chromium. Firefox y WebKit no se
// ejecutan en CI: su formato solo está cubierto con fixtures en tests/validators-xml.

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

const INVALID = [
  // [texto, offset, línea, columna, pista]
  ["<a><b></a>", 10, 1, 11, "mismatchedTag"],
  ["<a><b>", 6, 1, 7, "unclosedTag"],
  ["<a/><b/>", 4, 1, 5, "extraContent"],
  ["hola", 0, 1, 1, "noRoot"],
  ["<a>fish & chips</a>", 9, 1, 10, "unescapedAmpersand"],
  ["<a>&nbsp;</a>", 9, 1, 10, "undefinedEntity"],
  ["<a b=1/>", 5, 1, 6, "attributeQuotes"],
  ['<a b="1" b="2"/>', 14, 1, 15, "duplicateAttribute"],
  [' <?xml version="1.0"?><a/>', 6, 1, 7, "declPosition"],
  ["<a>1 < 2</a>", 6, 1, 7, "unescapedLt"],
  ["<root>\n  <a>\n    <b></c>\n  </a>\n</root>", 24, 3, 12, "mismatchedTag"],
  // Chrome cuenta puntos de código: el emoji ocupa 1 columna para el motor y 2 en UTF-16.
  ["<a>ñ😀</a><b/>", 10, 1, 11, "extraContent"],
  ["﻿<a><b></a>", 11, 1, 12, "mismatchedTag"],
];

for (const [text, offset, line, column, hint] of INVALID) {
  test(`xml real: ${JSON.stringify(text)} → línea ${line}, columna ${column} (${hint})`, async ({ page }) => {
    await page.goto("/");
    const r = await validateInPage(page, text);
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ offset, line, column, hint });
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
  expect(net.requests().slice(afterLoad).filter((u) => !u.endsWith("/lib/validators/xml.js") && !u.endsWith("/lib/validators/result.js") && !u.endsWith("/lib/validators/position.js"))).toEqual([]);
  expect(net.violations()).toEqual([]);
});
