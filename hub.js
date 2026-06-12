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
      cards.forEach((card) => {
        const text = normalize(card.querySelector(".tool-name")?.textContent + " " + card.querySelector(".tool-desc")?.textContent);
        card.hidden = q !== "" && !text.includes(q);
      });

      // Hide sub-sections whose every card is hidden
      section.querySelectorAll(".tools-subsection").forEach((sub) => {
        const subCards = sub.querySelectorAll(".tool-card:not(.is-soon)");
        const subVisible = q === "" || [...subCards].some((c) => !c.hidden);
        sub.hidden = !subVisible;
      });

      // Hide the whole section if nothing is visible
      const sectionVisible = q === "" || [...cards].some((c) => !c.hidden);
      section.hidden = !sectionVisible;
      if (sectionVisible) anyVisible = true;
    });

    if (emptyEl) emptyEl.hidden = anyVisible || q === "";
  });
})();
