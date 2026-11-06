// `test` de Playwright con una auditoría de red automática en CADA test: al terminar,
// ninguna petición (de la página ni de sus workers) puede haber ido a otro origen, ni
// ser distinta de un GET estático sin cuerpo. Es la comprobación en tiempo de ejecución
// de la promesa "nada sale del navegador" para todas las herramientas, no solo para las
// que tienen un test de red propio.
// Limitación: Playwright no informa de las peticiones que hace un Worker en Firefox, así que
// en ese motor el tráfico de los Workers (HEIC, schema) solo lo cubren Chromium y WebKit.
import { test as base, expect } from "@playwright/test";
import { auditNetwork } from "./helpers/network.mjs";

export const test = base.extend({
  networkAudit: [
    async ({ context, baseURL }, use) => {
      const net = auditNetwork(context, new URL(baseURL).origin);
      await use(net);
      expect(net.violations(), "peticiones de red no permitidas durante el test").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
