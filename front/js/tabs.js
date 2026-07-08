// ── Tabs navigation ───────────────────────────────────────
const TABS = [
  { id: "home",       label: "🏠 Accueil" },
  { id: "accuracy",   label: "🎯 Modelo vs Realidad" },
  { id: "classement", label: "🏆 Classement" },
  { id: "h2h",        label: "⚔️ Face à Face" },
  { id: "bracket_qf",  label: "🌳 Bracket (8)" },
  { id: "montecarlo_qf", label: "🎲 Monte Carlo (8)" },
  { id: "pronostics",  label: "🔮 Pronostics" }
];

const VALID_TABS = TABS.map(t => t.id);

function switchToTab(tabId) {
  const section = document.getElementById("sec-" + tabId);
  if (!section) return;

  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

  section.classList.add("active");
  const btn = document.querySelector(`.tab-btn[data-id="${tabId}"]`);
  if (btn) btn.classList.add("active");

  const header = document.querySelector("header");
  const fullContent = document.getElementById("header-full-content");
  const minimalContent = document.getElementById("header-minimal-content");

  if (tabId === "home") {
    if (header) header.classList.remove("header-minimal");
    if (fullContent) fullContent.style.display = "block";
    if (minimalContent) minimalContent.style.display = "none";
  } else {
    if (header) header.classList.add("header-minimal");
    if (fullContent) fullContent.style.display = "none";
    if (minimalContent) minimalContent.style.display = "block";
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace("#", "");
  const tabId = VALID_TABS.includes(hash) ? hash : "home";
  switchToTab(tabId);
}

function initTabs() {
  const nav = document.getElementById("tabsNav");
  const tabKeys = {
    "home": "tab_home",
    "accuracy": "tab_accuracy",
    "classement": "tab_classement",
    "pronostics": "tab_pronostics",
    "h2h": "tab_h2h",
    "bracket_qf":     "tab_bracket_qf",
    "montecarlo_qf":  "tab_montecarlo_qf"
  };

  TABS.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (t.id === "home" ? " active" : "");
    btn.textContent = t.label;
    btn.setAttribute("data-id", t.id);
    btn.setAttribute("data-i18n", tabKeys[t.id] || "");
    btn.onclick = () => {
      window.location.hash = t.id;
      switchToTab(t.id);
    };
    nav.appendChild(btn);
  });

  // Restaurer l'onglet depuis l'URL au chargement
  handleHashChange();

  // Écouter les changements de hash (boutons précédent/suivant du navigateur)
  window.addEventListener("hashchange", handleHashChange);
}
