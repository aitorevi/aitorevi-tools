// Filtro de búsqueda del hub — sin dependencias externas.
(() => {
  "use strict";
  const searchEl = document.getElementById("hub-search");
  const emptyEl  = document.getElementById("hub-empty");
  if (!searchEl) return;

  function normalize(str) {
    return str.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
  }

  searchEl.addEventListener("input", () => {
    const q = normalize(searchEl.value.trim());
    const sections = document.querySelectorAll(".tools-section");
    let anyVisible = false;

    sections.forEach((section) => {
      const cards = section.querySelectorAll(".tool-card:not(.is-soon)");
      let sectionVisible = false;
      cards.forEach((card) => {
        const text = normalize(card.querySelector(".tool-name")?.textContent + " " + card.querySelector(".tool-desc")?.textContent);
        const match = q === "" || text.includes(q);
        card.hidden = !match;
        if (match) sectionVisible = true;
      });
      section.hidden = !sectionVisible && q !== "";
      if (sectionVisible || q === "") anyVisible = true;
    });

    if (emptyEl) emptyEl.hidden = anyVisible || q === "";
  });
})();
