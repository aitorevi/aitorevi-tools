// Tema claro/oscuro por clase (.dark en <html>), igual que aitorevi.dev.
// Se ejecuta en <head> sin defer para fijar el tema antes del primer paint.
// Usa localStorage (preferencia funcional, no es cookie ni tracking).
(() => {
  "use strict";
  const root = document.documentElement;

  const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  const stored = localStorage.getItem("theme");
  const dark = stored ? stored === "dark" : !!(mq && mq.matches);
  root.classList.toggle("dark", dark);

  // Mientras el usuario no haya elegido manualmente, seguir el tema del SO en vivo.
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) root.classList.toggle("dark", e.matches);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isDark = root.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  });
})();
