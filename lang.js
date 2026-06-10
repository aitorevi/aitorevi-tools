// Idioma: persiste la elección del selector y, solo en la primera visita (sin
// elección previa), redirige al idioma del navegador usando el enlace hreflang.
// Se ejecuta en <head> sin defer para redirigir antes del primer paint.
// Usa localStorage (preferencia funcional, no es cookie ni tracking).
(() => {
  "use strict";
  const docLang = document.documentElement.lang || "es";

  // Al pulsar el selector, recuerda la elección (y deja de autodetectar).
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("[data-lang-switch]");
    if (a) localStorage.setItem("lang", a.getAttribute("hreflang"));
  });

  // Auto-redirect una sola vez: solo si el usuario no ha elegido idioma aún.
  if (localStorage.getItem("lang")) return;
  const pref = (navigator.language || docLang).slice(0, 2).toLowerCase();
  if (pref === docLang) return;
  const alt = document.querySelector(`link[rel="alternate"][hreflang="${pref}"]`);
  if (alt && alt.href && alt.href !== location.href) {
    localStorage.setItem("lang", pref); // respeta a partir de ahora y evita bucles
    location.replace(alt.href);
  }
})();
