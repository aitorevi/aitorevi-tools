import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JSON_HINT_KEYS } from "../lib/validators/json.js";
import { XML_HINT_KEYS } from "../lib/validators/xml.js";
import { YAML_HINT_KEYS } from "../lib/validators/yaml.js";
import { TOML_HINT_KEYS } from "../lib/validators/toml.js";
import { SCHEMA_HINTS, SCHEMA_HINT_KEYS } from "../lib/validators/json-schema.js";
import { GUIDE as JSON_GUIDE } from "../validar-json/guide.js";
import { GUIDE as XML_GUIDE } from "../validar-xml/guide.js";
import { GUIDE as YAML_GUIDE } from "../validar-yaml/guide.js";
import { GUIDE as TOML_GUIDE } from "../validar-toml/guide.js";

// Una pista que un validador puede devolver y no tiene texto en algún idioma se vería
// como un mensaje técnico en inglés sin que nada fallara: este test lo impide. Y al
// revés: un texto que ningún validador usa es código muerto.
const I18N = {
  es: JSON.parse(readFileSync(new URL("../i18n/es.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../i18n/en.json", import.meta.url), "utf8")),
};
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

// "empty" lo traduce la UI como estado vacío, no como pista.
const JSON_SYNTAX = JSON_HINT_KEYS.filter((k) => k !== "empty");
const TOOLS = {
  "validar-json": { hints: [...JSON_SYNTAX, ...SCHEMA_HINT_KEYS], guide: JSON_GUIDE },
  "validar-xml": { hints: XML_HINT_KEYS, guide: XML_GUIDE },
  "validar-yaml": { hints: YAML_HINT_KEYS, guide: YAML_GUIDE },
  "validar-toml": { hints: TOML_HINT_KEYS, guide: TOML_GUIDE },
};

for (const [tool, { hints, guide }] of Object.entries(TOOLS)) {
  for (const lang of ["es", "en"]) {
    describe(`${tool} (${lang})`, () => {
      const msg = I18N[lang].tools[tool].msg;

      it("cada pista que puede devolver el validador tiene texto", () => {
        expect(hints.filter((k) => !msg.hints[k]), "pistas sin texto").toEqual([]);
      });

      it("no hay textos de pista que ningún validador use", () => {
        expect(Object.keys(msg.hints).filter((k) => !hints.includes(k)), "textos huérfanos").toEqual([]);
      });

      it("los textos no están vacíos y terminan con signo de puntuación", () => {
        for (const [k, v] of Object.entries(msg.hints)) {
          expect(v.trim().length, k).toBeGreaterThan(5);
          expect(/[.?)}\]]$/.test(v.trim()) || /\{\w+\}$/.test(v.trim()), `${k}: «${v.slice(-20)}»`).toBe(true);
        }
      });

      it("la guía: cada fila y cada grupo tienen su texto", () => {
        const g = msg.guide;
        expect(g.title && g.intro).toBeTruthy();
        for (const group of guide) {
          expect(g.groups[group.name], `grupo ${group.name}`).toBeTruthy();
          for (const [, descKey] of group.rows) expect(g.desc[descKey], `fila ${descKey}`).toBeTruthy();
        }
        const used = guide.flatMap((gr) => gr.rows.map((r) => r[1]));
        expect(Object.keys(g.desc).filter((k) => !used.includes(k)), "textos de guía huérfanos").toEqual([]);
      });

      it("hay titulares de válido e inválido", () => {
        expect(msg.valid && msg.invalid).toBeTruthy();
      });
    });
  }
}

describe("pistas del modo schema: las {marcas} son los parámetros que rellena el código", () => {
  for (const lang of ["es", "en"]) {
    for (const [key, params] of Object.entries(SCHEMA_HINTS)) {
      it(`${lang} · ${key}`, () => {
        const text = I18N[lang].tools["validar-json"].msg.hints[key];
        const used = placeholders(text);
        expect(used.filter((p) => !params.includes(p)), "marcas que el código no rellena").toEqual([]);
        // un parámetro que el código calcula y el texto nunca usa es un parámetro muerto
        if (params.length > 0) expect(used.length, "el texto no usa ningún parámetro").toBeGreaterThan(0);
      });
    }
  }
});

describe("textos del modo schema y etiquetas comunes", () => {
  for (const lang of ["es", "en"]) {
    it(`${lang}: etapas, etiquetas y plurales completos`, () => {
      const m = I18N[lang].tools["validar-json"].msg;
      for (const stage of ["syntax", "missing", "schema", "validation", "valid", "timeout"]) expect(m.stage[stage], stage).toBeTruthy();
      for (const key of ["schemaToggle", "schemaLabel", "schemaPlaceholder", "schemaIdle", "schemaDraft", "srcDocument", "srcSchema", "pathRoot", "itemJump", "itemJumpAria", "moreErrors"]) {
        expect(m[key], key).toBeTruthy();
      }
      expect(m.errorUnit.one && m.errorUnit.many).toBeTruthy();
      expect(placeholders(m.stage.validation).sort()).toEqual(["errors", "n"]);
      expect(placeholders(m.moreErrors).sort()).toEqual(["n", "shown"]);
    });

    it(`${lang}: todos los textos comunes que usa la UI de validadores existen`, () => {
      const c = I18N[lang].common;
      for (const key of ["valPlaceholder", "valValidate", "valIdle", "valPending", "valLarge", "valAt", "valNoPosition", "valJump",
        "valTechnical", "valBom", "valFormatted", "valMinified", "valRootType", "valKeys", "valDepth", "codeInput", "codeOutput", "codeSample", "clear"]) {
        expect(c[key], key).toBeTruthy();
      }
    });
  }

  it("los tipos de valor que pueden salir en meta tienen etiqueta en JSON y YAML", () => {
    for (const lang of ["es", "en"]) {
      for (const tool of ["validar-json", "validar-yaml"]) {
        const types = I18N[lang].tools[tool].msg.types;
        for (const t of ["object", "array", "string", "number", "boolean", "null"]) expect(types[t], `${lang} ${tool} ${t}`).toBeTruthy();
      }
      expect(I18N[lang].tools["validar-yaml"].msg.types.date).toBeTruthy();
    }
  });
});

describe("coherencia entre idiomas", () => {
  it("ES y EN tienen las mismas claves y las mismas {marcas} en todos los validadores", () => {
    const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
    for (const tool of Object.keys(TOOLS)) {
      const es = new Map(flat(I18N.es.tools[tool]));
      const en = new Map(flat(I18N.en.tools[tool]));
      expect([...es.keys()].filter((k) => !en.has(k)), `${tool}: faltan en EN`).toEqual([]);
      expect([...en.keys()].filter((k) => !es.has(k)), `${tool}: faltan en ES`).toEqual([]);
      for (const [k, v] of es) {
        if (typeof v === "string") expect(placeholders(v).sort(), `${tool}.${k}`).toEqual(placeholders(en.get(k)).sort());
      }
    }
  });
});

describe("accesibilidad: el nombre accesible contiene el texto visible (WCAG 2.5.3)", () => {
  for (const lang of ["es", "en"]) {
    it(`${lang}: «Ir al error» de la lista y su aria-label`, () => {
      const m = I18N[lang].tools["validar-json"].msg;
      expect(m.itemJumpAria.toLowerCase()).toContain(m.itemJump.toLowerCase());
    });
  }
});
