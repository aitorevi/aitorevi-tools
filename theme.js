// Tema claro/oscuro por clase (.dark en <html>), igual que aitorevi.dev.
// Se ejecuta en <head> sin defer para fijar el tema antes del primer paint.
// Usa localStorage (preferencia funcional, no es cookie ni tracking).
(() => {
  "use strict";
  const root = document.documentElement;

  const stored = localStorage.getItem("theme");
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = stored ? stored === "dark" : prefersDark;
  root.classList.toggle("dark", dark);

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isDark = root.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  });
})();
