// ══════════════════════════════════════════════════════════
// BRACKET CUARTOS — Phase Finale des Quarts à la Finale (8)
// ══════════════════════════════════════════════════════════

const BRACKET_QF_ROUNDS = [
  { id: "qf",  name: "Quarts" },
  { id: "sf",  name: "Demis" },
  { id: "final", name: "Finale" }
];

const NEXT_ROUND_QF = {
  "qf": "sf",
  "sf": "final",
  "final": null
};

// QF matchups — actual quarterfinal pairings
const QF_MATCHUPS = [
  { t1: "France", t2: "Morocco" },
  { t1: "Spain", t2: "Belgium" },
  { t1: "Norway", t2: "England" },
  { t1: "Argentina", t2: "Switzerland" }
];

let bracketQFData = { qf: [], sf: [], final: [] };
let simulationQFMode = 'data';
let bracketQFSelectedRound = 'qf';
let bracketQFMode = 'desktop';

// ── Helpers de match réel ──────────────────────────────────
function getRealWinnerQF(t1, t2) {
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

function getRealScoreQF(t1, t2) {
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

function initBracketQFData() {
  // Build QF matches directly from known matchups
  bracketQFData.qf = QF_MATCHUPS.map((m, i) => ({
    id: `qf-${i+1}`, t1: m.t1, t2: m.t2, w: null
  }));

  bracketQFData.sf = Array.from({length: 2}, (_, i) => ({ id: `qf-sf-${i+1}`, t1: null, t2: null, w: null }));
  bracketQFData.final = [{ id: `qf-final-1`, t1: null, t2: null, w: null }];

  // Resolve QF winners if already played in real life
  bracketQFData.qf.forEach(match => {
    const realW = getRealWinnerQF(match.t1, match.t2);
    if (realW) match.w = realW;
  });
}

function simulateFullBracketQF(mode = 'data') {
  simulationQFMode = mode;
  initBracketQFData();
  recomputeBracketQF(mode);
  renderBracketQF();
}

function propagateWinnerQF(roundId, matchIndex, winner) {
  const nextRound = NEXT_ROUND_QF[roundId];
  if (!nextRound) return;
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const isTeam1 = matchIndex % 2 === 0;
  if (isTeam1) bracketQFData[nextRound][nextMatchIndex].t1 = winner;
  else bracketQFData[nextRound][nextMatchIndex].t2 = winner;
}

function manualSelectionHandlerQF(round, matchIndex, winnerTeam) {
  bracketQFData[round][matchIndex].manualWinner = winnerTeam;
  bracketQFData[round][matchIndex].w = winnerTeam;
  recomputeBracketQF(simulationQFMode);
  renderBracketQF();
}

function recomputeBracketQF(mode = 'data') {
  BRACKET_QF_ROUNDS.forEach(roundDef => {
    const roundId = roundDef.id;
    const matches = bracketQFData[roundId];
    matches.forEach((match, index) => {
      if (match.t1 && match.t2 && match.t1 !== "TBD" && match.t2 !== "TBD") {
        const realW = getRealWinnerQF(match.t1, match.t2);
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
            const probs = getMatchProbabilitiesQF(match);
            const p = probs ? probs.prob1 : 0.5;
            const steepP = Math.pow(p, 3) / (Math.pow(p, 3) + Math.pow(1 - p, 3));
            winner = Math.random() < steepP ? match.t1 : match.t2;
          } else {
            winner = Math.random() < 0.5 ? match.t1 : match.t2;
          }
        }
        match.w = winner;
        propagateWinnerQF(roundId, index, winner);
      } else {
        match.w = null;
      }
    });
  });
}

function getMatchProbabilitiesQF(match) {
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
    for (let i = 0; i <= 7; i++) {
      for (let j = 0; j <= 7; j++) {
        const p = poisson(i, xgA) * poisson(j, xgB);
        if (i > j) probA += p;
        else if (i < j) probB += p;
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

// ── Création HTML d'un match ───────────────────────────────
function createMatchHTMLQF(match, round, index) {
  const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
  const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";
  const t1Name = match.t1 || "TBD";
  const t2Name = match.t2 || "TBD";

  const realScore = getRealScoreQF(match.t1, match.t2);
  let p1Text = "", p2Text = "", realResultClass = "";

  if (realScore) {
    realResultClass = "real-result";
    const p1Score = realScore.p1 !== null ? `<span class="bracket-pen">(${realScore.p1})</span>` : "";
    const p2Score = realScore.p2 !== null ? `<span class="bracket-pen">(${realScore.p2})</span>` : "";
    p1Text = ` <span class="bracket-score">${realScore.s1}${p1Score}</span>`;
    p2Text = ` <span class="bracket-score">${realScore.s2}${p2Score}</span>`;
  } else {
    const probs = getMatchProbabilitiesQF(match);
    p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
    p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";
  }

  const onClickT1 = match.t1 && !realScore ? `onclick="manualSelectionHandlerQF('${round}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
  const onClickT2 = match.t2 && !realScore ? `onclick="manualSelectionHandlerQF('${round}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";
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
function renderBracketDesktopQF() {
  const container = document.getElementById("bracket-container-qf");
  if (!container) return;
  const baseUnit = (typeof getBaseUnit === 'function') ? getBaseUnit() : 74;
  const totalHeight = 4 * baseUnit;

  let html = `<div class="bracket-scroll" id="bracket-desktop-qf">`;
  html += `<div class="bracket-wrapper" style="position:relative; min-height:${totalHeight + 60}px;">`;
  html += `<canvas class="bracket-canvas" id="bracket-canvas-qf"></canvas>`;

  BRACKET_QF_ROUNDS.forEach(roundDef => {
    const matches = bracketQFData[roundDef.id];
    const slotHeight = Math.max((4 / matches.length) * baseUnit, baseUnit);
    html += `<div class="bracket-column" id="col-qf-${roundDef.id}" style="flex:1; min-width:0;">`;
    html += `<h3 class="round-title">${roundDef.name}</h3>`;
    html += `<div class="bracket-col-slots" style="display:flex; flex-direction:column; justify-content:center; gap:4px;">`;
    matches.forEach((match, index) => {
      html += `<div class="bracket-slot" style="height:${slotHeight}px; display:flex; align-items:center; justify-content:center; padding:2px 0; overflow:hidden;">`;
      html += createMatchHTMLQF(match, roundDef.id, index);
      html += `</div>`;
    });
    html += `</div></div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;
  requestAnimationFrame(() => { requestAnimationFrame(() => drawConnectorsQF()); });
}

function drawConnectorsQF() {
  const canvas = document.getElementById("bracket-canvas-qf");
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

  ["qf", "sf"].forEach(roundId => {
    const col = document.getElementById(`col-qf-${roundId}`);
    const nextRoundId = NEXT_ROUND_QF[roundId];
    const nextCol = document.getElementById(`col-qf-${nextRoundId}`);
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
      const matchData = bracketQFData[roundId]?.[i];
      const hasWinner = matchData?.w && matchData.w !== null;
      ctx.strokeStyle = hasWinner ? "rgba(240, 192, 64, 0.5)" : "rgba(122, 144, 168, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(midX, y1); ctx.lineTo(midX, y2); ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  });
}

// ── RENDU MOBILE ───────────────────────────────────────────
function renderBracketMobileQF() {
  const container = document.getElementById("bracket-container-qf");
  if (!container) return;
  const roundDef = BRACKET_QF_ROUNDS.find(r => r.id === bracketQFSelectedRound) || BRACKET_QF_ROUNDS[0];
  const matches = bracketQFData[roundDef.id] || [];

  let tabsHtml = `<div class="bracket-mobile-tabs">`;
  BRACKET_QF_ROUNDS.forEach(r => {
    const active = r.id === bracketQFSelectedRound ? "active" : "";
    tabsHtml += `<button class="bracket-mobile-tab ${active}" onclick="selectBracketRoundQF('${r.id}')">${r.name}</button>`;
  });
  tabsHtml += `</div>`;

  let matchesHtml = `<div class="bracket-mobile-matches">`;
  matches.forEach((match, index) => {
    const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
    const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";
    const t1Name = match.t1 || "TBD";
    const t2Name = match.t2 || "TBD";
    const realScore = getRealScoreQF(match.t1, match.t2);
    let p1Text = "", p2Text = "", realResultClass = "";
    if (realScore) {
      realResultClass = "real-result";
      const p1Score = realScore.p1 !== null ? `<span class="bracket-pen">(${realScore.p1})</span>` : "";
      const p2Score = realScore.p2 !== null ? `<span class="bracket-pen">(${realScore.p2})</span>` : "";
      p1Text = ` <span class="bracket-score">${realScore.s1}${p1Score}</span>`;
      p2Text = ` <span class="bracket-score">${realScore.s2}${p2Score}</span>`;
    } else {
      const probs = getMatchProbabilitiesQF(match);
      p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
      p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";
    }
    const onClickT1 = match.t1 && !realScore ? `onclick="manualSelectionHandlerQF('${roundDef.id}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
    const onClickT2 = match.t2 && !realScore ? `onclick="manualSelectionHandlerQF('${roundDef.id}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";
    let progressIndicator = "";
    const nextRoundId = NEXT_ROUND_QF[roundDef.id];
    if (nextRoundId) {
      const nextMatchIdx = Math.floor(index / 2);
      progressIndicator = `<div class="bracket-mobile-progress"><span class="progress-arrow">→</span><span class="progress-label">${BRACKET_QF_ROUNDS.find(r => r.id === nextRoundId)?.name || ""} #${nextMatchIdx + 1}</span></div>`;
    }
    const titleAttr = realScore ? `title="${t('real_official') || 'Resultados reales y oficiales'}"` : "";
    matchesHtml += `
      <div class="bracket-mobile-match-card ${realResultClass}" ${titleAttr}>
        <div class="bracket-mobile-match-header"><span class="match-num">Match ${index + 1}</span>${progressIndicator}</div>
        <div class="bracket-team ${t1Class}" ${onClickT1}><span class="team-name">${t1Name}</span>${p1Text}</div>
        <div class="bracket-team ${t2Class}" ${onClickT2}><span class="team-name">${t2Name}</span>${p2Text}</div>
      </div>`;
  });
  matchesHtml += `</div>`;
  container.innerHTML = `<div class="bracket-mobile" id="bracket-mobile-qf">${tabsHtml}${matchesHtml}</div>`;
}

function selectBracketRoundQF(roundId) {
  bracketQFSelectedRound = roundId;
  renderBracketMobileQF();
}

function renderBracketQF() {
  if (window.innerWidth < 768) { bracketQFMode = "mobile"; renderBracketMobileQF(); }
  else { bracketQFMode = "desktop"; renderBracketDesktopQF(); }
}

let bracketQFResizeDebounce = null;
function handleBracketQFResize() {
  clearTimeout(bracketQFResizeDebounce);
  bracketQFResizeDebounce = setTimeout(() => {
    const newMode = window.innerWidth < 768 ? "mobile" : "desktop";
    if (newMode !== bracketQFMode) { bracketQFMode = newMode; bracketQFSelectedRound = "qf"; renderBracketQF(); }
    else if (bracketQFMode === "desktop") { requestAnimationFrame(() => { requestAnimationFrame(() => drawConnectorsQF()); }); }
  }, 200);
}

// ── Initialisation du module ───────────────────────────────
function initBracketQFModule() {
  document.getElementById("btn-sim-random-qf")?.addEventListener("click", () => simulateFullBracketQF('random'));
  document.getElementById("btn-sim-data-qf")?.addEventListener("click", () => simulateFullBracketQF('data'));
  window.addEventListener("resize", handleBracketQFResize);
  initBracketQFData();
  renderBracketQF();
}
