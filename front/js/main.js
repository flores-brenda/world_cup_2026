// ── Main – initialisation de l'application (v5.1) ────────────────
// Ce fichier doit être chargé EN DERNIER, après tous les autres JS.

document.addEventListener("DOMContentLoaded", () => {
  // Chart.js defaults
  Chart.defaults.color       = "#7a90a8";
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size   = 12;

  // Initialisation des onglets et du cache
  initTabs();
  const { stats } = initCache();

  // ── Calcul Elo (avant les modules qui en dépendent) ──────
  const { ratings, globalAvg } = buildEloRatings(stats);
  window.ELO_RATINGS   = ratings;
  window.ELO_GLOBAL_AVG = globalAvg;
  console.log(`✅ Elo calculé — ${Object.keys(ratings).length} équipes · avg buts/match: ${globalAvg.toFixed(3)}`);

  // Rendu de chaque section
  renderHeaderStats(stats);
  renderClassement(stats);
  renderGroupes(stats);
  renderScatter(stats);
  renderPalmares(stats);
  renderPronostics(stats);
  renderH2H(stats);
  renderSimulador(stats);

  // Nuevos módulos — datos en tiempo real
  // initResultados carga el JSON de forma asíncrona y luego llama a los renderers correspondientes
  if (typeof initResultados === 'function') {
    initResultados().then(() => {
      if (typeof renderHomeResults === 'function') renderHomeResults();
      if (typeof renderModeloAccuracy === 'function') renderModeloAccuracy();
      if (typeof initMatchCenter    === 'function') initMatchCenter();
      
      // Inicializar brackets y Monte Carlo después de cargar los resultados
      if (typeof initBracketModule === 'function') initBracketModule();
      if (typeof initBracketR16Module === 'function') initBracketR16Module();
      if (typeof initMonteCarloModule === 'function') initMonteCarloModule();
      if (typeof initMonteCarloR16Module === 'function') initMonteCarloR16Module();
    });
  }

  // Traduire tous les éléments après leur rendu
  if (typeof initI18n === 'function') initI18n();

  // Compte à rebours
  initCountdown();
});
