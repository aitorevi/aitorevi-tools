import { describe, it, expect } from "vitest";
import { describeValue, typeOf } from "../lib/validators/describe.js";

describe("typeOf", () => {
  it("distingue los tipos de un valor parseado", () => {
    expect(typeOf(null)).toBe("null");
    expect(typeOf([])).toBe("array");
    expect(typeOf({})).toBe("object");
    expect(typeOf(Object.create(null))).toBe("object");
    expect(typeOf(new Date())).toBe("date");
    expect(typeOf("x")).toBe("string");
    expect(typeOf(1)).toBe("number");
    expect(typeOf(true)).toBe("boolean");
  });
});

describe("describeValue", () => {
  it("primitivo: profundidad 0 y sin claves", () => {
    expect(describeValue(42)).toEqual({ rootType: "number", keyCount: 0, objectCount: 0, depth: 0 });
  });

  it("contenedores vacíos: profundidad 1", () => {
    expect(describeValue({}).depth).toBe(1);
    expect(describeValue([]).depth).toBe(1);
  });

  it("cuenta claves y objetos de todos los niveles", () => {
    const d = describeValue({ a: 1, b: { c: 2, d: [{ e: 3 }] } });
    expect(d).toMatchObject({ rootType: "object", keyCount: 5, objectCount: 3, depth: 4 });
  });

  it("objetos con prototipo nulo (smol-toml) cuentan como objetos", () => {
    const o = Object.create(null);
    o.a = Object.create(null);
    o.a.b = 1;
    expect(describeValue(o)).toMatchObject({ keyCount: 2, objectCount: 2, depth: 2 });
  });

  it("fechas e instancias de clases son valores simples, no contenedores", () => {
    class TomlDate extends Date {}
    const d = describeValue({ when: new Date(), t: new TomlDate(), x: new (class Foo { constructor() { this.k = 1; } })() });
    expect(d).toMatchObject({ keyCount: 3, objectCount: 1, depth: 1 });
  });

  it("no desborda la pila con anidamiento muy profundo", () => {
    let v = [];
    for (let i = 0; i < 100000; i++) v = [v];
    expect(describeValue(v).depth).toBe(100001);
  });
});
