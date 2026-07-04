// ══════════════════════════════════════════════════════════
// BRACKET OCTAVOS — Phase Finale de Huitièmes à la Finale
// ══════════════════════════════════════════════════════════

const BRACKET_R16_ROUNDS = [
  { id: "r16", name: "Huitièmes" },
  { id: "qf",  name: "Quarts" },
  { id: "sf",  name: "Demis" },
  { id: "final", name: "Finale" }
];

const NEXT_ROUND_R16 = {
  "r16": "qf",
  "qf": "sf",
  "sf": "final",
  "final": null
};

let bracketR16Data = {
  r16: [],
  qf: [],
  sf: [],
  final: []
};

let simulationR16Mode = 'data';
let bracketR16SelectedRound = 'r16';
let bracketR16Mode = 'desktop';

// ── Helpers de match réel ──────────────────────────────────
function getRealPlayedMatchWinnerR16(t1, t2) {
  if (!t1 || !t2 || t1 === "TBD" || t2 === "TBD") return null;
  if (!window.RESULTADOS_2026 || !window.RESULTADOS_2026.matches) return null;
  
  const match = window.RESULTADOS_2026.matches.find(m => 
    ((m.home === t1 && m.away === t2) || (m.home === t2 && m.away === t1)) &&
    m.home_score !== null && m.away_score !== null
  );
  if (!match) return null;
  
  if (match.winner) return match.winner;
  if (match.penalties) {
    if (match.penalties.home > match.penalties.away) return match.home;
    if (match.penalties.away > match.penalties.home) return match.away;
  }
  if (match.home_score > match.away_score) return match.home;
  if (match.away_score > match.home_score) return match.away;
  return null;
}

function getRealPlayedMatchScoreR16(t1, t2) {
  if (!t1 || !t2 || t1 === "TBD" || t2 === "TBD") return null;
  if (!window.RESULTADOS_2026 || !window.RESULTADOS_2026.matches) return null;
  
  const match = window.RESULTADOS_2026.matches.find(m => 
    ((m.home === t1 && m.away === t2) || (m.home === t2 && m.away === t1)) &&
    m.home_score !== null && m.away_score !== null
  );
  if (!match) return null;
  
  return {
    s1: match.home === t1 ? match.home_score : match.away_score,
    s2: match.home === t1 ? match.away_score : match.home_score,
    p1: match.penalties ? (match.home === t1 ? match.penalties.home : match.penalties.away) : null,
    p2: match.penalties ? (match.home === t1 ? match.penalties.away : match.penalties.home) : null
  };
}

function initBracketR16Data() {
  const ratings = window.ELO_RATINGS || {};
  const strMap = {};
  if (window.PREDICTIONS && window.PREDICTIONS.strengths) {
    window.PREDICTIONS.strengths.forEach(s => strMap[s.equipe] = s);
  }
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;

  bracketR16Data.r16 = [
    { id: "r16-1", t1: "Canada", t2: "Morocco", w: null },
    { id: "r16-2", t1: "Paraguay", t2: "France", w: null },
    { id: "r16-3", t1: "Brazil", t2: "Norway", w: null },
    { id: "r16-4", t1: "Mexico", t2: "England", w: null },
    { id: "r16-5", t1: "Portugal", t2: "Spain", w: null },
    { id: "r16-6", t1: "United States", t2: "Belgium", w: null },
    { id: "r16-7", t1: "Argentina", t2: "Egypt", w: null },
    { id: "r16-8", t1: "Switzerland", t2: "Colombia", w: null }
  ];

  bracketR16Data.qf  = Array.from({length: 4}, (_, i) => ({ id: `r16-qf-${i+1}`, t1: null, t2: null, w: null }));
  bracketR16Data.sf  = Array.from({length: 2}, (_, i) => ({ id: `r16-sf-${i+1}`, t1: null, t2: null, w: null }));
  bracketR16Data.final = [{ id: `r16-final-1`, t1: null, t2: null, w: null }];

  // Resolve winners if they are already played in the real world
  bracketR16Data.r16.forEach(match => {
    const realW = getRealPlayedMatchWinnerR16(match.t1, match.t2);
    if (realW) {
      match.w = realW;
    }
  });
}

function simulateFullBracketR16(mode = 'data') {
  simulationR16Mode = mode;
  initBracketR16Data();
  recomputeBracketR16(mode);
  renderBracketR16();
}

function propagateWinnerR16(roundId, matchIndex, winner) {
  const nextRound = NEXT_ROUND_R16[roundId];
  if (!nextRound) return;
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const isTeam1 = matchIndex % 2 === 0;
  if (isTeam1) bracketR16Data[nextRound][nextMatchIndex].t1 = winner;
  else bracketR16Data[nextRound][nextMatchIndex].t2 = winner;
}

function manualSelectionHandlerR16(round, matchIndex, winnerTeam) {
  bracketR16Data[round][matchIndex].manualWinner = winnerTeam;
  bracketR16Data[round][matchIndex].w = winnerTeam;
  recomputeBracketR16(simulationR16Mode);
  renderBracketR16();
}

function recomputeBracketR16(mode = 'data') {
  BRACKET_R16_ROUNDS.forEach(roundDef => {
    const roundId = roundDef.id;
    const matches = bracketR16Data[roundId];

    matches.forEach((match, index) => {
      if (match.t1 && match.t2 && match.t1 !== "TBD" && match.t2 !== "TBD") {
        
        // 1. Check if there is a real result for this match
        const realW = getRealPlayedMatchWinnerR16(match.t1, match.t2);
        
        let winner;
        if (realW) {
          winner = realW;
        } else if (match.manualWinner) {
          if (match.manualWinner !== match.t1 && match.manualWinner !== match.t2) {
            match.manualWinner = null;
          } else {
            winner = match.manualWinner;
          }
        }
        
        if (!winner) {
          if (match.w && (match.w === match.t1 || match.w === match.t2)) {
            winner = match.w;
          } else if (mode === 'data') {
            const probs = getMatchProbabilitiesR16(match);
            const p = probs ? probs.prob1 : 0.5;
            const steepP = Math.pow(p, 3) / (Math.pow(p, 3) + Math.pow(1 - p, 3));
            winner = Math.random() < steepP ? match.t1 : match.t2;
          } else {
            winner = Math.random() < 0.5 ? match.t1 : match.t2;
          }
        }
        
        match.w = winner;
        propagateWinnerR16(roundId, index, winner);
      } else {
        match.w = null;
      }
    });
  });
}

function getMatchProbabilitiesR16(match) {
  if (!match.t1 || !match.t2 || match.t1 === "TBD" || match.t2 === "TBD") return null;
  
  if (window.PREDICTIONS && window.PREDICTIONS.strengths) {
    const strMap = {};
    window.PREDICTIONS.strengths.forEach(s => strMap[s.equipe] = s);
    
    const strA = strMap[match.t1] || { attack_strength: 1, defense_weakness: 1 };
    const strB = strMap[match.t2] || { attack_strength: 1, defense_weakness: 1 };
    const avg = window.PREDICTIONS.global_avg || 1.3;
    
    const xgA = strA.attack_strength * strB.defense_weakness * avg;
    const xgB = strB.attack_strength * strA.defense_weakness * avg;
    
    const fact = n => n <= 1 ? 1 : n * fact(n - 1);
    const poisson = (k, lambda) => (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / fact(k);
    
    let probA = 0, probB = 0, probDraw = 0;
    for(let i=0; i<=7; i++) {
      for(let j=0; j<=7; j++) {
        const p = poisson(i, xgA) * poisson(j, xgB);
        if(i > j) probA += p;
        else if(i < j) probB += p;
        else probDraw += p;
      }
    }
    const prob1 = probA + (probDraw / 2);
    const p1 = Math.round(prob1 * 100);
    return { p1, p2: 100 - p1, prob1 };
  } else {
    const ratings = window.ELO_RATINGS || {};
    const elo1 = ratings[match.t1] || 1200;
    const elo2 = ratings[match.t2] || 1200;
    const prob1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    const p1 = Math.round(prob1 * 100);
    return { p1, p2: 100 - p1, prob1 };
  }
}

// ── Création HTML d'un match (desktop) ─────────────────────
function createMatchHTMLR16(match, round, index) {
  const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
  const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";

  const t1Name = match.t1 || "TBD";
  const t2Name = match.t2 || "TBD";

  const realScore = getRealPlayedMatchScoreR16(match.t1, match.t2);
  let p1Text = "";
  let p2Text = "";
  let realResultClass = "";

  if (realScore) {
    realResultClass = "real-result";
    const p1Score = realScore.p1 !== null ? `<span class="bracket-pen">(${realScore.p1})</span>` : "";
    const p2Score = realScore.p2 !== null ? `<span class="bracket-pen">(${realScore.p2})</span>` : "";
    p1Text = ` <span class="bracket-score">${realScore.s1}${p1Score}</span>`;
    p2Text = ` <span class="bracket-score">${realScore.s2}${p2Score}</span>`;
  } else {
    const probs = getMatchProbabilitiesR16(match);
    p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
    p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";
  }

  const onClickT1 = match.t1 && !realScore ? `onclick="manualSelectionHandlerR16('${round}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
  const onClickT2 = match.t2 && !realScore ? `onclick="manualSelectionHandlerR16('${round}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";

  const titleAttr = realScore ? `title="${t('real_official') || 'Resultados reales y oficiales'}"` : "";

  return `
    <div class="bracket-match ${realResultClass}" ${titleAttr} data-round="${round}" data-index="${index}">
      <div class="bracket-team ${t1Class}" ${onClickT1}>
        <span class="team-name">${t1Name}${p1Text}</span>
      </div>
      <div class="bracket-team ${t2Class}" ${onClickT2}>
        <span class="team-name">${t2Name}${p2Text}</span>
      </div>
    </div>
  `;
}

// ── RENDU DESKTOP ──────────────────────────────────────────
function renderBracketDesktopR16() {
  const container = document.getElementById("bracket-container-r16");
  if (!container) return;

  const baseUnit = (typeof getBaseUnit === 'function') ? getBaseUnit() : 74;
  const totalHeight = 8 * baseUnit; // Moitié de la hauteur (car on commence à r16)

  let html = `<div class="bracket-scroll" id="bracket-desktop-r16">`;
  html += `<div class="bracket-wrapper" style="position:relative; min-height:${totalHeight + 60}px;">`;
  html += `<canvas class="bracket-canvas" id="bracket-canvas-r16"></canvas>`;

  BRACKET_R16_ROUNDS.forEach(roundDef => {
    const matches = bracketR16Data[roundDef.id];
    const slotHeight = Math.max((8 / matches.length) * baseUnit, baseUnit);

    html += `<div class="bracket-column" id="col-r16-${roundDef.id}" style="flex:1; min-width:0;">`;
    html += `<h3 class="round-title">${roundDef.name}</h3>`;
    html += `<div class="bracket-col-slots" style="display:flex; flex-direction:column; justify-content:center; gap:4px;">`;

    matches.forEach((match, index) => {
      html += `<div class="bracket-slot" style="height:${slotHeight}px; display:flex; align-items:center; justify-content:center; padding:2px 0; overflow:hidden;">`;
      html += createMatchHTMLR16(match, roundDef.id, index);
      html += `</div>`;
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => drawConnectorsR16());
  });
}

// ── Dessin des connecteurs (Canvas) ────────────────────────
function drawConnectorsR16() {
  const canvas = document.getElementById("bracket-canvas-r16");
  const wrapper = canvas?.parentElement;
  if (!canvas || !wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = wrapperRect.width * dpr;
  canvas.height = wrapperRect.height * dpr;
  canvas.style.width = wrapperRect.width + "px";
  canvas.style.height = wrapperRect.height + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, wrapperRect.width, wrapperRect.height);

  const drawRounds = ["r16", "qf", "sf"];

  drawRounds.forEach(roundId => {
    const col = document.getElementById(`col-r16-${roundId}`);
    const nextRoundId = NEXT_ROUND_R16[roundId];
    const nextCol = document.getElementById(`col-r16-${nextRoundId}`);
    if (!col || !nextCol) return;

    const matches = col.querySelectorAll(".bracket-match");
    const nextMatches = nextCol.querySelectorAll(".bracket-match");

    matches.forEach((match, i) => {
      const nextIdx = Math.floor(i / 2);
      if (nextIdx >= nextMatches.length) return;

      const mRect = match.getBoundingClientRect();
      const nmRect = nextMatches[nextIdx].getBoundingClientRect();

      const x1 = mRect.right - wrapperRect.left;
      const y1 = mRect.top + mRect.height / 2 - wrapperRect.top;

      const x2 = nmRect.left - wrapperRect.left;
      const y2 = nmRect.top + nmRect.height / 2 - wrapperRect.top;

      const midX = x1 + (x2 - x1) * 0.55;

      const matchData = bracketR16Data[roundId]?.[i];
      const hasWinner = matchData?.w && matchData.w !== null;
      ctx.strokeStyle = hasWinner
        ? "rgba(240, 192, 64, 0.5)"
        : "rgba(122, 144, 168, 0.25)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  });
}

// ── RENDU MOBILE (Round by Round) ──────────────────────────
function renderBracketMobileR16() {
  const container = document.getElementById("bracket-container-r16");
  if (!container) return;

  const roundDef = BRACKET_R16_ROUNDS.find(r => r.id === bracketR16SelectedRound) || BRACKET_R16_ROUNDS[0];
  const matches = bracketR16Data[roundDef.id] || [];

  let tabsHtml = `<div class="bracket-mobile-tabs">`;
  BRACKET_R16_ROUNDS.forEach(r => {
    const active = r.id === bracketR16SelectedRound ? "active" : "";
    tabsHtml += `<button class="bracket-mobile-tab ${active}" onclick="selectBracketRoundR16('${r.id}')">${r.name}</button>`;
  });
  tabsHtml += `</div>`;

  let matchesHtml = `<div class="bracket-mobile-matches">`;
  matches.forEach((match, index) => {
    const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
    const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";
    const t1Name = match.t1 || "TBD";
    const t2Name = match.t2 || "TBD";

    const realScore = getRealPlayedMatchScoreR16(match.t1, match.t2);
    let p1Text = "";
    let p2Text = "";
    let realResultClass = "";

    if (realScore) {
      realResultClass = "real-result";
      const p1Score = realScore.p1 !== null ? `<span class="bracket-pen">(${realScore.p1})</span>` : "";
      const p2Score = realScore.p2 !== null ? `<span class="bracket-pen">(${realScore.p2})</span>` : "";
      p1Text = ` <span class="bracket-score">${realScore.s1}${p1Score}</span>`;
      p2Text = ` <span class="bracket-score">${realScore.s2}${p2Score}</span>`;
    } else {
      const probs = getMatchProbabilitiesR16(match);
      p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
      p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";
    }

    const onClickT1 = match.t1 && !realScore ? `onclick="manualSelectionHandlerR16('${roundDef.id}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
    const onClickT2 = match.t2 && !realScore ? `onclick="manualSelectionHandlerR16('${roundDef.id}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";

    let progressIndicator = "";
    const nextRoundId = NEXT_ROUND_R16[roundDef.id];
    if (nextRoundId) {
      const nextMatchIdx = Math.floor(index / 2);
      progressIndicator = `<div class="bracket-mobile-progress">
        <span class="progress-arrow">→</span>
        <span class="progress-label">${BRACKET_R16_ROUNDS.find(r => r.id === nextRoundId)?.name || ""} #${nextMatchIdx + 1}</span>
      </div>`;
    }

    const titleAttr = realScore ? `title="${t('real_official') || 'Resultados reales y oficiales'}"` : "";

    matchesHtml += `
      <div class="bracket-mobile-match-card ${realResultClass}" ${titleAttr}>
        <div class="bracket-mobile-match-header">
          <span class="match-num">Match ${index + 1}</span>
          ${progressIndicator}
        </div>
        <div class="bracket-team ${t1Class}" ${onClickT1}>
          <span class="team-name">${t1Name}</span>
          ${p1Text}
        </div>
        <div class="bracket-team ${t2Class}" ${onClickT2}>
          <span class="team-name">${t2Name}</span>
          ${p2Text}
        </div>
      </div>
    `;
  });
  matchesHtml += `</div>`;

  container.innerHTML = `<div class="bracket-mobile" id="bracket-mobile-r16">${tabsHtml}${matchesHtml}</div>`;
}

function selectBracketRoundR16(roundId) {
  bracketR16SelectedRound = roundId;
  renderBracketMobileR16();
}

function renderBracketR16() {
  const w = window.innerWidth;
  if (w < 768) {
    bracketR16Mode = "mobile";
    renderBracketMobileR16();
  } else {
    bracketR16Mode = "desktop";
    renderBracketDesktopR16();
  }
}

let bracketR16ResizeDebounce = null;
function handleBracketR16Resize() {
  clearTimeout(bracketR16ResizeDebounce);
  bracketR16ResizeDebounce = setTimeout(() => {
    const newMode = window.innerWidth < 768 ? "mobile" : "desktop";
    if (newMode !== bracketR16Mode) {
      bracketR16Mode = newMode;
      bracketR16SelectedRound = "r16";
      renderBracketR16();
    } else if (bracketR16Mode === "desktop") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => drawConnectorsR16());
      });
    }
  }, 200);
}

// ── Initialisation du module ───────────────────────────────
function initBracketR16Module() {
  document.getElementById("btn-sim-random-r16")?.addEventListener("click", () => {
    simulateFullBracketR16('random');
  });
  
  document.getElementById("btn-sim-data-r16")?.addEventListener("click", () => {
    simulateFullBracketR16('data');
  });

  window.addEventListener("resize", handleBracketR16Resize);

  initBracketR16Data();
  renderBracketR16();
}
