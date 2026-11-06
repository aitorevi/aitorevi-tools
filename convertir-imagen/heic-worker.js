import { convertHeic } from "../vendor/heic-converter/index.mjs";

// PNG sin pérdida como intermedio: el formato final lo produce el Canvas de app.js.
self.addEventListener("message", async ({ data }) => {
  try {
    const blob = await convertHeic(data.file, { to: "png" });
    self.postMessage({ id: data.id, ok: true, blob });
  } catch (error) {
    self.postMessage({
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
