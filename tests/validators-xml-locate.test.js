import { describe, it, expect } from "vitest";
import { findUnclosedTag } from "../lib/validators/xml-locate.js";
import { normalizeXmlError } from "../lib/validators/xml.js";

describe("findUnclosedTag", () => {
  const at = (text) => findUnclosedTag(text);

  it("devuelve la etiqueta de apertura más interna sin cerrar", () => {
    expect(at("<a><b>")).toBe(3);
    expect(at("<a><b></b>")).toBe(0);
    expect(at("<root>\n  <a>\n    <b>x</b>\n")).toBe(9);
  });

  it("un XML completo no tiene etiqueta sin cerrar", () => {
    expect(at("<a><b/><c></c></a>")).toBeNull();
    expect(at("")).toBeNull();
  });

  it("las etiquetas autocerradas no abren nada, aunque lleven atributos", () => {
    expect(at('<a><b x="1" /><c/>')).toBe(0);
  });

  it("ignora comentarios, CDATA, instrucciones y DOCTYPE con etiquetas dentro", () => {
    expect(at("<?xml version='1.0'?><!DOCTYPE a [<!ELEMENT a ANY>]><a><!-- <b> --><![CDATA[<c>]]>")).toBe(
      "<?xml version='1.0'?><!DOCTYPE a [<!ELEMENT a ANY>]>".length,
    );
  });

  it("un `>` dentro de un atributo no cierra la etiqueta", () => {
    expect(at('<a t="x>y"><b>')).toBe('<a t="x>y">'.length);
  });

  it("una etiqueta que ni termina es la que falta por cerrar", () => {
    expect(at('<a><b x="1"')).toBe(3);
  });

  it("un cierre que no corresponde u otro defecto deja la decisión al motor (null)", () => {
    expect(at("<a><b></a>")).toBeNull();
    expect(at("</a>")).toBeNull();
    expect(at("<a><!-- sin cerrar")).toBeNull();
    expect(at("<a><b < c>")).toBeNull();
    expect(at("<a></a")).toBeNull();
  });

  it("las posiciones son UTF-16 (un emoji antes cuenta 2)", () => {
    expect(at("<a>😀<b>")).toBe(5);
  });
});

describe("normalizeXmlError · etiqueta sin cerrar", () => {
  const chrome = (line, col, msg) => `This page contains the following errors:error on line ${line} at column ${col}: ${msg}\nBelow is a rendering of the page up to the first error.`;

  it("señala la etiqueta de apertura en vez del final del texto", () => {
    const text = "<root>\n  <a>\n    <b>x</b>\n";
    const e = normalizeXmlError(chrome(4, 1, "Premature end of data in tag a line 2"), text);
    expect(e).toMatchObject({ hint: "unclosedTag", offset: 9, line: 2, column: 3 });
  });

  it("si el recorrido no encaja, conserva la posición del motor", () => {
    const e = normalizeXmlError(chrome(1, 11, "Premature end of data in tag a line 1"), "<a><b></a>");
    expect(e).toMatchObject({ hint: "unclosedTag", offset: 10, line: 1, column: 11 });
  });

  it("no toca otras pistas", () => {
    const e = normalizeXmlError(chrome(1, 11, "Opening and ending tag mismatch: b line 1 and a"), "<a><b></a>");
    expect(e).toMatchObject({ hint: "mismatchedTag", offset: 10 });
  });
});
