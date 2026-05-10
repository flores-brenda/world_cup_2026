// ── Tabs navigation ───────────────────────────────────────
const TABS = [
  { id: "classement", label: "🏆 Classement" },
  { id: "groupes",    label: "🗂️ Groupes 2026" },
  { id: "scatter",    label: "📊 Performance" },
  { id: "palmares",   label: "🥇 Palmarès" },
  { id: "pronostics", label: "🔮 Pronostics" },
  { id: "h2h",        label: "⚔️ Face à Face" },
  { id: "simulador",  label: "🎲 Simulateur des Groupes" }
];

function initTabs() {
  const nav = document.getElementById("tabsNav");
  const tabKeys = {
    "classement": "tab_classement",
    "groupes": "tab_groupes",
    "scatter": "tab_scatter",
    "palmares": "tab_palmares",
    "pronostics": "tab_pronostics",
    "h2h": "tab_h2h",
    "simulador": "tab_simulador"
  };

  TABS.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (t.id === "classement" ? " active" : "");
    btn.textContent = t.label;
    btn.setAttribute("data-id", t.id);
    btn.setAttribute("data-i18n", tabKeys[t.id] || "");
    btn.onclick = () => {
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.getElementById("sec-" + t.id).classList.add("active");
      btn.classList.add("active");
    };
    nav.appendChild(btn);
  });
}
