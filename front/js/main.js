// ── Main – initialisation de l'application ────────────────
// Ce fichier doit être chargé EN DERNIER, après tous les autres JS.

document.addEventListener("DOMContentLoaded", () => {
  // Chart.js defaults
  Chart.defaults.color       = "#7a90a8";
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size   = 12;

  // Initialisation des onglets et du cache
  initTabs();
  const { stats } = initCache();

  // Rendu de chaque section
  renderHeaderStats(stats);
  renderClassement(stats);
  renderGroupes(stats);
  renderScatter(stats);
  renderPalmares(stats);
  renderPronostics(stats);
  renderH2H(stats);
  renderSimulador(stats);

  // Compte à rebours
  initCountdown();
});
