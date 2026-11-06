import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSchemaChecker } from "../validar-json/schema-client.js";

// Un Worker falso: guarda lo que recibe y deja a cada test decidir si responde, cuándo
// y cómo. Así se prueban la cancelación y el límite de tiempo sin navegador.
class FakeWorker {
  static all = [];
  constructor(url, opts) {
    this.url = url;
    this.opts = opts;
    this.sent = [];
    this.terminated = false;
    this.listeners = { message: new Set(), error: new Set() };
    FakeWorker.all.push(this);
  }
  addEventListener(type, fn) { this.listeners[type].add(fn); }
  removeEventListener(type, fn) { this.listeners[type].delete(fn); }
  postMessage(data) { this.sent.push(data); }
  terminate() { this.terminated = true; }
  reply(raw, id = this.sent[this.sent.length - 1].id) { for (const fn of [...this.listeners.message]) fn({ data: { id, raw } }); }
  fail(message) { for (const fn of [...this.listeners.error]) fn({ message }); }
}

const D = "https://json-schema.org/draft/2020-12/schema";
const doc = '{"a": 5}';
const schema = JSON.stringify({ $schema: D, properties: { a: { type: "string" } } });
const make = (timeoutMs = 4000) => createSchemaChecker({ workerUrl: "/w.js", timeoutMs, WorkerImpl: FakeWorker });
const VALID_RAW = { stage: "valid", units: [] };
const flush = () => Promise.resolve().then(() => Promise.resolve());

beforeEach(() => { FakeWorker.all = []; vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

describe("createSchemaChecker", () => {
  it("un error de sintaxis se resuelve sin crear el Worker", async () => {
    const check = make();
    const r = await check('{"a":1,}', schema);
    expect(r.meta.stage).toBe("syntax");
    expect(FakeWorker.all).toHaveLength(0);
  });

  it("los dos textos vacíos tampoco crean el Worker", async () => {
    const r = await make()("", "");
    expect(r.meta.stage).toBe("empty");
    expect(FakeWorker.all).toHaveLength(0);
  });

  it("crea un Worker de módulo y le manda schema, documento y draft ya parseados", async () => {
    const check = make();
    const p = check(doc, schema);
    const w = FakeWorker.all[0];
    expect(w.opts).toEqual({ type: "module" });
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0]).toMatchObject({ doc: { a: 5 }, draft: "2020-12", schema: { properties: { a: { type: "string" } } } });
    w.reply(VALID_RAW);
    expect((await p).valid).toBe(true);
  });

  it("traduce la respuesta del Worker con las posiciones del texto", async () => {
    const check = make();
    const p = check(doc, schema);
    FakeWorker.all[0].reply({
      stage: "validation",
      units: [{ instanceLocation: "#/a", keyword: "type", keywordLocation: "#/properties/a/type", error: 'Instance type "number" is invalid. Expected "string".' }],
    });
    const r = await p;
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatchObject({ path: "/a", hint: "kw_type", source: "document", offset: doc.indexOf("5") });
  });

  it("reutiliza el mismo Worker entre validaciones", async () => {
    const check = make();
    const p1 = check(doc, schema);
    FakeWorker.all[0].reply(VALID_RAW);
    await p1;
    const p2 = check(doc, schema);
    FakeWorker.all[0].reply(VALID_RAW);
    await p2;
    expect(FakeWorker.all).toHaveLength(1);
    expect(FakeWorker.all[0].sent).toHaveLength(2);
  });

  it("ignora las respuestas de otra petición", async () => {
    const check = make();
    const p = check(doc, schema);
    const w = FakeWorker.all[0];
    w.reply({ stage: "validation", units: [] }, 999); // id ajeno
    w.reply(VALID_RAW);
    expect((await p).valid).toBe(true);
  });

  it("si el Worker no responde a tiempo: cancela, lo termina y avisa con la pista timeout", async () => {
    const check = make(4000);
    const p = check(doc, schema);
    await vi.advanceTimersByTimeAsync(4000);
    const r = await p;
    expect(FakeWorker.all[0].terminated).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.meta).toEqual({ stage: "timeout", draft: "2020-12" });
    expect(r.errors[0]).toMatchObject({ hint: "timeout", source: "schema" });
  });

  it("tras un timeout, la siguiente validación crea un Worker nuevo", async () => {
    const check = make(1000);
    const p1 = check(doc, schema);
    await vi.advanceTimersByTimeAsync(1000);
    await p1;
    const p2 = check(doc, schema);
    expect(FakeWorker.all).toHaveLength(2);
    FakeWorker.all[1].reply(VALID_RAW);
    expect((await p2).valid).toBe(true);
  });

  it("gana la última: una validación en curso se cancela al llegar otra", async () => {
    const check = make();
    const p1 = check(doc, schema);
    const first = FakeWorker.all[0];
    const p2 = check(doc, schema);
    expect(first.terminated).toBe(true);
    expect((await p1).meta.stage).toBe("cancelled");
    expect(FakeWorker.all).toHaveLength(2); // la nueva usa un Worker limpio
    FakeWorker.all[1].reply(VALID_RAW);
    expect((await p2).valid).toBe(true);
  });

  it("un error del Worker (no se pudo cargar) se muestra como error del schema y se reinicia", async () => {
    const check = make();
    const p = check(doc, schema);
    FakeWorker.all[0].fail("Failed to load module script");
    const r = await p;
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatchObject({ source: "schema", message: "Failed to load module script" });
    expect(FakeWorker.all[0].terminated).toBe(true);
    await flush();
  });

  it("limpia el temporizador y los oyentes al terminar (sin fugas)", async () => {
    const check = make();
    const p = check(doc, schema);
    const w = FakeWorker.all[0];
    w.reply(VALID_RAW);
    await p;
    expect(w.listeners.message.size).toBe(0);
    expect(w.listeners.error.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
