(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("nav-hamburger");
    const nav = document.querySelector(".site-nav");
    if (!btn || !nav) return;

    const open = () => {
      nav.classList.add("nav-open");
      btn.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      nav.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      nav.classList.contains("nav-open") ? close() : open();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    document.addEventListener("click", (e) => {
      if (nav.classList.contains("nav-open") && !nav.contains(e.target)) close();
    });

    const menu = document.getElementById("nav-mobile-menu");
    if (menu) {
      menu.addEventListener("click", (e) => {
        if (e.target.tagName === "A") close();
      });
    }
  });
})();
