import { describe, it, expect } from "vitest";
import {
  buildPointerIndex,
  escapePointer,
  fragmentToPointer,
  locatePointer,
  pointerSegments,
  unescapePointer,
} from "../lib/validators/json-pointer.js";

describe("fragmentToPointer", () => {
  it("raíz y rutas simples", () => {
    expect(fragmentToPointer("#")).toBe("");
    expect(fragmentToPointer("#/usuarios/0/email")).toBe("/usuarios/0/email");
    expect(fragmentToPointer("/a/b")).toBe("/a/b");
  });

  it("quita el porcentaje y conserva los escapes ~0 y ~1 del JSON Pointer", () => {
    expect(fragmentToPointer("#/a~1b~0c%20d")).toBe("/a~1b~0c d");
    expect(fragmentToPointer("#/ni%C3%B1o")).toBe("/niño");
    expect(fragmentToPointer("#/100%25")).toBe("/100%");
  });

  it("un porcentaje inválido se deja tal cual", () => {
    expect(fragmentToPointer("#/a%zz")).toBe("/a%zz");
  });
});

describe("escapar y partir rutas", () => {
  it("escapePointer / unescapePointer son inversas", () => {
    for (const key of ["a", "a/b", "a~b", "~1", "/", "~/~"]) expect(unescapePointer(escapePointer(key))).toBe(key);
    expect(escapePointer("a/b~c")).toBe("a~1b~0c");
  });

  it("pointerSegments", () => {
    expect(pointerSegments("")).toEqual([]);
    expect(pointerSegments("/a~1b/0/~0")).toEqual(["a/b", "0", "~"]);
    expect(pointerSegments("/")).toEqual([""]);
  });
});

describe("buildPointerIndex", () => {
  const starts = (text) => Object.fromEntries([...buildPointerIndex(text)].map(([k, v]) => [k, v.start]));

  it("objeto, array y anidado", () => {
    const text = '{"a":1,"b":[true,{"c":null}]}';
    expect(starts(text)).toEqual({
      "": 0,
      "/a": 5,
      "/b": 11,
      "/b/0": 12,
      "/b/1": 17,
      "/b/1/c": 22,
    });
  });

  it("primitivo suelto", () => {
    expect(starts("  42 ")).toEqual({ "": 2 });
    expect(starts('"hola"')).toEqual({ "": 0 });
  });

  it("registra el inicio de la clave", () => {
    const idx = buildPointerIndex('{"a": 1,\n "b": 2}');
    expect(idx.get("/b").keyStart).toBe(10);
    expect(idx.get("/b").start).toBe(15);
    expect(idx.get("").keyStart).toBeNull();
  });

  it("claves con barra, tilde, escapes y unicode", () => {
    const text = '{"a/b":1,"c~d":2,"q\\"x":3,"\\u00e9":4}';
    const idx = buildPointerIndex(text);
    expect(text[idx.get("/a~1b").start]).toBe("1");
    expect(text[idx.get("/c~0d").start]).toBe("2");
    expect(text[idx.get('/q"x').start]).toBe("3");
    expect(text[idx.get("/é").start]).toBe("4");
  });

  it("la puntuación dentro de cadenas no confunde el recorrido", () => {
    const text = '{"k,:{}[]":"v,:{}[]","z":[1]}';
    const idx = buildPointerIndex(text);
    expect(text[idx.get("/z/0").start]).toBe("1");
    expect(idx.has("/k,:{}[]")).toBe(true);
  });

  it("con claves repetidas gana la última, como JSON.parse", () => {
    const text = '{"a":1,"a":2}';
    expect(text[buildPointerIndex(text).get("/a").start]).toBe("2");
  });

  it("no desborda la pila con anidamiento muy profundo", () => {
    const n = 100000;
    const idx = buildPointerIndex("[".repeat(n) + "]".repeat(n));
    expect(idx.size).toBe(n);
  });
});

describe("locatePointer", () => {
  const text = '{"a":{"b":[10,20]}}';
  const idx = buildPointerIndex(text);

  it("valor y clave", () => {
    expect(locatePointer(idx, "/a/b/1")).toBe(text.indexOf("20"));
    expect(locatePointer(idx, "/a/b", "key")).toBe(text.indexOf('"b"'));
    expect(locatePointer(idx, "", "key")).toBe(0); // la raíz no tiene clave: usa el inicio del valor
  });

  it("si la ruta no existe sube al ancestro más cercano", () => {
    expect(locatePointer(idx, "/a/b/9")).toBe(text.indexOf("[10"));
    expect(locatePointer(idx, "/nada/mas")).toBe(0);
  });

  it("índice vacío → null", () => {
    expect(locatePointer(buildPointerIndex(""), "/a")).toBeNull();
  });
});

describe("buildPointerIndex · contraste con JSON.parse", () => {
  const seed = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const rand = seed(99);
  const KEYS = ["a", "b", "a/b", "c~d", "x y", "ñ", 'q"r', "0", "", "100%"];
  const gen = (d) => {
    const r = rand();
    if (d > 3 || r < 0.35) return [0, -1.5, "txt", 'a"b,{}', true, null][Math.floor(rand() * 6)];
    if (r < 0.65) return Array.from({ length: Math.floor(rand() * 4) }, () => gen(d + 1));
    const o = {};
    for (let i = Math.floor(rand() * 4); i > 0; i--) o[KEYS[Math.floor(rand() * KEYS.length)]] = gen(d + 1);
    return o;
  };
  const walk = (value, ptr, out) => {
    out.push([ptr, value]);
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${ptr}/${i}`, out));
    else if (value && typeof value === "object") for (const k of Object.keys(value)) walk(value[k], `${ptr}/${escapePointer(k)}`, out);
    return out;
  };

  it("cada ruta del valor apunta al primer carácter de su valor en el texto", () => {
    for (let n = 0; n < 300; n++) {
      const value = gen(0);
      const text = JSON.stringify(value, null, rand() < 0.5 ? 2 : "\t");
      const idx = buildPointerIndex(text);
      for (const [ptr, v] of walk(value, "", [])) {
        const hit = idx.get(ptr);
        expect(hit, `${ptr} en ${text}`).toBeDefined();
        expect(text[hit.start], `${ptr} en ${text}`).toBe(JSON.stringify(v)[0]);
        if (hit.keyStart != null) expect(text[hit.keyStart]).toBe('"');
      }
    }
  });
});
