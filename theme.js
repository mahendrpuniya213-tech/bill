(function () {
  const KEY = "billing_theme";

  function getPreferred() {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  function setAttr(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Runs immediately — this file is loaded in <head>, before first paint,
  // so the correct theme is applied with no flash of the wrong one.
  setAttr(getPreferred());

  function syncButtons() {
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    document.querySelectorAll(".theme-toggle").forEach(btn => {
      btn.textContent = theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
      btn.setAttribute("aria-label", theme === "dark" ? "लाइट थीम पर जाएँ" : "डार्क थीम पर जाएँ");
      btn.title = btn.getAttribute("aria-label");
    });
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    setAttr(next);
    syncButtons();
  };

  document.addEventListener("DOMContentLoaded", syncButtons);
})();
