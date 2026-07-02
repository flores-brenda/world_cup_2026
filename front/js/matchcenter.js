// ── Match Center — Seguimiento Día a Día de la Fase Final ─────────────
let matchCenterActiveRound = "all";

// Helper locales para evitar dependencias
function mcFact(n) { return n <= 1 ? 1 : n * mcFact(n - 1); }
function mcPoisson(k, lambda) { return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / mcFact(k); }

function getMatchCenterFlagHtml(team, size = 44) {
  if (typeof flagImg === 'function') {
    return flagImg(team, size);
  }
  const code = (window.FLAG_CODES && window.FLAG_CODES[team]) || 'un';
  return `<img src="https://flagcdn.com/w80/${code}.png" width="${size}"
    style="border-radius:4px; border:1px solid rgba(255,255,255,0.12); display:block; margin:0 auto;"
    alt="${team}">`;
}

// ── Inyección dinámica de estilos premium ─────────────────────────────
function injectMatchCenterStyles() {
  if (document.getElementById("matchcenter-styles")) return;

  const css = `
    /* Filtros de ronda */
    .matchcenter-filters {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .matchcenter-filters .btn-filter {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--muted);
      border-radius: 20px;
      padding: 8px 18px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
    }
    .matchcenter-filters .btn-filter:hover {
      border-color: var(--gold);
      color: var(--text);
    }
    .matchcenter-filters .btn-filter.active {
      background: linear-gradient(135deg, var(--gold), var(--blue-light));
      border-color: transparent;
      color: #000;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(240, 192, 64, 0.2);
    }

    /* Grid y Tarjetas */
    .matchcenter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 10px;
    }
    .mc-card {
      background: rgba(30, 41, 59, 0.45);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .mc-card:hover {
      transform: translateY(-4px);
      border-color: var(--gold);
      box-shadow: 0 8px 24px rgba(240, 192, 64, 0.1);
    }

    /* Bordes de estado */
    .mc-card.finished {
      border-left: 4px solid var(--green);
    }
    .mc-card.upcoming {
      border-left: 4px solid var(--blue-light);
    }

    /* Cabecera interna */
    .mc-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .mc-round-badge {
      font-size: 9px;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--gold);
    }
    .mc-date {
      font-size: 11px;
      color: var(--muted);
      font-weight: 500;
    }

    /* Equipos y Marcador */
    .mc-teams-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 12px 0;
    }
    .mc-team-col {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .mc-team-name {
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
      text-transform: uppercase;
      color: var(--text);
      line-height: 1.2;
      transition: color 0.3s;
    }
    .mc-team-name.winner-name {
      color: var(--green);
    }
    .mc-score-col {
      text-align: center;
      min-width: 90px;
    }
    .mc-score {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 40px;
      color: var(--text);
      line-height: 1;
      letter-spacing: 2px;
    }
    .mc-score.finished-score {
      color: var(--green);
    }
    .mc-score.penalties-score {
      font-size: 32px;
    }
    .pen-score {
      font-size: 14px;
      color: var(--muted);
      vertical-align: super;
      margin-left: 2px;
    }
    .mc-vs-badge {
      font-size: 11px;
      font-weight: bold;
      color: var(--muted);
      background: rgba(255,255,255,0.05);
      padding: 4px 8px;
      border-radius: 50%;
      display: inline-block;
    }

    /* Clasificados y sede */
    .mc-winner-badge {
      background: rgba(74, 222, 128, 0.1);
      border: 1px solid rgba(74, 222, 128, 0.2);
      color: var(--green);
      font-size: 11px;
      font-weight: bold;
      padding: 5px 8px;
      border-radius: 6px;
      text-align: center;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .mc-venue-info {
      font-size: 10px;
      color: var(--muted);
      text-align: center;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Predicciones IA */
    .mc-ia-toggle {
      background: none;
      border: none;
      color: var(--gold);
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      padding: 8px 0 0 0;
      margin-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      transition: color 0.2s;
    }
    .mc-ia-toggle:hover {
      color: var(--text);
    }
    .mc-ia-content {
      display: none;
      padding-top: 12px;
      border-top: 1px dashed rgba(255,255,255,0.08);
      margin-top: 10px;
      animation: mcSlideDown 0.3s ease-out;
    }
    .mc-ia-content.active {
      display: block;
    }
    .mc-pred-bars {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
      background: rgba(255,255,255,0.05);
    }
    .mc-pred-bar {
      height: 100%;
      transition: width 0.3s ease;
    }
    .mc-pred-bar.home-bar { background: var(--green); }
    .mc-pred-bar.draw-bar { background: var(--gold); }
    .mc-pred-bar.away-bar { background: var(--blue-light); }

    .mc-pred-legend {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .mc-xg-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text);
      margin: 4px 0;
    }

    /* Botón Simulador */
    .mc-sim-btn {
      background: rgba(240, 192, 64, 0.1);
      border: 1px solid rgba(240, 192, 64, 0.3);
      color: var(--gold);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
      transition: all 0.2s;
    }
    .mc-sim-btn:hover {
      background: var(--gold);
      color: #000;
    }
    .mc-sim-result {
      display: none;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      padding: 8px;
      font-size: 11px;
      text-align: center;
      margin-top: 8px;
      font-weight: bold;
      color: var(--gold);
      border-left: 3px solid var(--gold);
      animation: mcFadeIn 0.4s ease-out;
    }

    @keyframes mcSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes mcFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  const style = document.createElement("style");
  style.id = "matchcenter-styles";
  style.innerHTML = css;
  document.head.appendChild(style);
}

// ── Clasificación Matemática de Rondas de Eliminatorias ──────────────────
function classifyKnockoutMatches() {
  if (!RESULTADOS_2026 || !RESULTADOS_2026.matches) return [];

  const koMatches = RESULTADOS_2026.matches.filter(m => !m.group || m.group === "");
  const teamPlayCount = {};

  return koMatches.map(m => {
    const tA = m.home;
    const tB = m.away;

    if (tA !== "TBD") teamPlayCount[tA] = (teamPlayCount[tA] || 0) + 1;
    if (tB !== "TBD") teamPlayCount[tB] = (teamPlayCount[tB] || 0) + 1;

    const countA = teamPlayCount[tA] || 1;
    const countB = teamPlayCount[tB] || 1;
    const maxCount = Math.max(countA, countB);

    let roundId = "r32";
    if (maxCount === 2) roundId = "r16";
    else if (maxCount === 3) roundId = "qf";
    else if (maxCount === 4) roundId = "sf";
    else if (maxCount >= 5) roundId = "final";

    return {
      ...m,
      roundId
    };
  });
}

// ── Inicialización ────────────────────────────────────────────────────
function initMatchCenter() {
  injectMatchCenterStyles();

  // Escuchadores de clics de los filtros
  const filters = document.querySelectorAll(".matchcenter-filters .btn-filter");
  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      matchCenterActiveRound = btn.getAttribute("data-round");
      renderMatchCenter();
    });
  });

  renderMatchCenter();
}

// ── Renderizado Principal ─────────────────────────────────────────────
function renderMatchCenter() {
  const container = document.getElementById("matchcenter-container");
  if (!container) return;

  if (!RESULTADOS_2026) {
    container.innerHTML = `<div class="info-box" style="text-align:center; padding:30px;">⏳ Loading...</div>`;
    return;
  }

  const classified = classifyKnockoutMatches();
  
  // Filtrar
  const filtered = classified.filter(m => matchCenterActiveRound === "all" || m.roundId === matchCenterActiveRound);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="info-box" style="text-align:center; padding:30px; color:var(--muted);">${t('mc_no_matches')}</div>`;
    return;
  }

  let html = `<div class="matchcenter-grid">`;
  filtered.forEach((match, idx) => {
    html += buildMatchCardHTML(match, idx);
  });
  html += `</div>`;

  container.innerHTML = html;
}

// ── Constructor HTML de Tarjeta de Partido ────────────────────────────
function buildMatchCardHTML(match, idx) {
  const isFinished = match.home_score !== null && match.away_score !== null;
  const cardClass = isFinished ? "finished" : "upcoming";
  
  // Nombres de Rondas traducibles
  const roundNames = {
    r32: t("mc_filter_r32") || "16vos",
    r16: t("mc_filter_r16") || "8vos",
    qf: t("mc_filter_qf") || "Cuartos",
    sf: t("mc_filter_sf") || "Semifinal",
    final: t("mc_filter_final") || "Final"
  };
  const roundName = roundNames[match.roundId] || match.roundId;

  // Ganador real
  let homeWinnerClass = "";
  let awayWinnerClass = "";
  let winnerBadgeHtml = "";

  if (isFinished) {
    const winnerName = match.winner || (match.home_score > match.away_score ? match.home : (match.home_score < match.away_score ? match.away : null));
    if (winnerName === match.home) {
      homeWinnerClass = "winner-name";
    } else if (winnerName === match.away) {
      awayWinnerClass = "winner-name";
    }
    
    if (winnerName) {
      const qualifiedLabel = t("mc_qualified") || "Clasificado";
      winnerBadgeHtml = `
        <div class="mc-winner-badge">
          <span>🏆</span>
          <span>${qualifiedLabel}: <strong>${winnerName}</strong></span>
        </div>`;
    }
  }

  // Marcador o VS
  let scoreHtml = "";
  if (isFinished) {
    if (match.penalties) {
      scoreHtml = `<div class="mc-score finished-score penalties-score">
        ${match.home_score}<span class="pen-score">(${match.penalties.home})</span>–${match.away_score}<span class="pen-score">(${match.penalties.away})</span>
      </div>`;
    } else {
      scoreHtml = `<div class="mc-score finished-score">${match.home_score}–${match.away_score}</div>`;
    }
  } else {
    scoreHtml = `<div class="mc-vs-badge">VS</div>`;
  }

  // Predicción IA
  const pred = getMatchStatsPrediction(match.home, match.away);
  let iaSectionHtml = "";
  if (pred && !isFinished && match.home !== "TBD" && match.away !== "TBD") {
    iaSectionHtml = `
      <button class="mc-ia-toggle" onclick="toggleIASection(${idx})">
        <span>🔮</span> <span data-i18n="mc_pred_title">${t("mc_pred_title")}</span>
      </button>
      <div class="mc-ia-content" id="mc-ia-content-${idx}">
        <div class="mc-xg-row">
          <span>${match.home} (xG)</span>
          <strong>${pred.xgA} - ${pred.xgB}</strong>
          <span>(xG) ${match.away}</span>
        </div>
        <div class="mc-pred-bars">
          <div class="mc-pred-bar home-bar" style="width: ${pred.pA}%" title="${match.home}: ${pred.pA}%"></div>
          <div class="mc-pred-bar draw-bar" style="width: ${pred.pDraw}%" title="Empate: ${pred.pDraw}%"></div>
          <div class="mc-pred-bar away-bar" style="width: ${pred.pB}%" title="${match.away}: ${pred.pB}%"></div>
        </div>
        <div class="mc-pred-legend">
          <span>${pred.pA}% ${match.home.substring(0,6)}</span>
          <span>${pred.pDraw}% Nul</span>
          <span>${pred.pB}% ${match.away.substring(0,6)}</span>
        </div>
        <div style="font-size: 10px; color: var(--gold); text-align: center; margin-bottom: 8px;">
          Marcador más probable: ${pred.likelyHomeGoals} – ${pred.likelyAwayGoals}
        </div>
        <button class="mc-sim-btn" onclick="simulateMatchOnCard('${match.home.replace(/'/g, "\\'")}', '${match.away.replace(/'/g, "\\'")}', ${idx})">
          ${t("mc_sim_btn") || "Simular"}
        </button>
        <div class="mc-sim-result" id="sim-result-${idx}"></div>
      </div>
    `;
  }

  const stadiumInfo = match.stadium ? `${match.stadium}, ${match.city}` : match.city;

  return `
    <div class="mc-card ${cardClass}">
      <div class="mc-card-header">
        <span class="mc-round-badge">${roundName}</span>
        <span class="mc-date">${match.date}</span>
      </div>
      <div class="mc-teams-row">
        <!-- Local -->
        <div class="mc-team-col">
          ${getMatchCenterFlagHtml(match.home, 44)}
          <span class="mc-team-name ${homeWinnerClass}">${match.home}</span>
        </div>
        
        <!-- Marcador -->
        <div class="mc-score-col">
          ${scoreHtml}
        </div>

        <!-- Visitante -->
        <div class="mc-team-col">
          ${getMatchCenterFlagHtml(match.away, 44)}
          <span class="mc-team-name ${awayWinnerClass}">${match.away}</span>
        </div>
      </div>

      ${winnerBadgeHtml}

      <div class="mc-venue-info">${stadiumInfo}</div>

      ${iaSectionHtml}
    </div>
  `;
}

// ── Manejo de acordeón de IA ──────────────────────────────────────────
function toggleIASection(idx) {
  const content = document.getElementById(`mc-ia-content-${idx}`);
  if (content) {
    content.classList.toggle("active");
  }
}

// ── Predicción de Estadísticas (Poisson + Dixon-Coles) ─────────────────
function getMatchStatsPrediction(teamA, teamB) {
  const preds = typeof PREDICTIONS !== 'undefined' ? PREDICTIONS : (window.PREDICTIONS || null);
  if (!preds || !preds.strengths) return null;
  
  const strMap = {};
  preds.strengths.forEach(s => strMap[s.equipe] = s);
  
  const strA = strMap[teamA] || { attack_strength: 1, defense_weakness: 1 };
  const strB = strMap[teamB] || { attack_strength: 1, defense_weakness: 1 };
  const avg  = preds.global_avg || 1.3;

  const xgA = strA.attack_strength * strB.defense_weakness * avg;
  const xgB = strB.attack_strength * strA.defense_weakness * avg;

  let probA = 0, probB = 0, probDraw = 0;
  let maxP = -1;
  let likelyHomeGoals = 0;
  let likelyAwayGoals = 0;

  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const p = mcPoisson(i, xgA) * mcPoisson(j, xgB);
      if (i > j) probA += p;
      else if (i < j) probB += p;
      else probDraw += p;

      if (p > maxP) {
        maxP = p;
        likelyHomeGoals = i;
        likelyAwayGoals = j;
      }
    }
  }

  const sum = probA + probB + probDraw;
  const pA = Math.round((probA / sum) * 100);
  const pB = Math.round((probB / sum) * 100);
  const pDraw = 100 - pA - pB;

  return {
    xgA: xgA.toFixed(2),
    xgB: xgB.toFixed(2),
    pA,
    pDraw,
    pB,
    likelyHomeGoals,
    likelyAwayGoals
  };
}

// ── Simulación del Partido ────────────────────────────────────────────
function simulateMatchOnCard(teamA, teamB, cardIdx) {
  const simResultDiv = document.getElementById(`sim-result-${cardIdx}`);
  if (!simResultDiv) return;

  simResultDiv.style.display = "block";
  simResultDiv.innerHTML = `⚽ Simulando...`;

  const pred = getMatchStatsPrediction(teamA, teamB);
  if (!pred) {
    simResultDiv.innerHTML = `⚠️ Error al simular.`;
    return;
  }

  setTimeout(() => {
    // Generar goles basados en Poisson (desde elo.js)
    let simGoalsA = 0;
    let simGoalsB = 0;
    if (typeof simPoissonGoals === 'function') {
      simGoalsA = simPoissonGoals(parseFloat(pred.xgA));
      simGoalsB = simPoissonGoals(parseFloat(pred.xgB));
    } else {
      simGoalsA = Math.floor(Math.random() * 4);
      simGoalsB = Math.floor(Math.random() * 4);
    }

    let extraTimeMsg = "";
    let winner = "";
    if (simGoalsA > simGoalsB) {
      winner = teamA;
    } else if (simGoalsA < simGoalsB) {
      winner = teamB;
    } else {
      // Penaltis (Elo ponderado)
      const eloA = window.ELO_RATINGS?.[teamA] || 1500;
      const eloB = window.ELO_RATINGS?.[teamB] || 1500;
      const probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
      const penaltyWinner = Math.random() < probA ? teamA : teamB;
      const penA = penaltyWinner === teamA ? 5 : Math.floor(3 + Math.random() * 2);
      const penB = penaltyWinner === teamB ? 5 : Math.floor(3 + Math.random() * 2);
      extraTimeMsg = ` (P: ${penA}-${penB})`;
      winner = penaltyWinner;
    }

    const winnerText = t('mc_qualified') || 'Clasificado';
    simResultDiv.innerHTML = `
      <div>Simulación: ${teamA} ${simGoalsA} – ${simGoalsB} ${teamB}${extraTimeMsg}</div>
      <div style="color: var(--green); margin-top: 4px;">🏆 ${winnerText}: ${winner}</div>
    `;
  }, 600);
}
