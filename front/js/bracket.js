// ── Simulateur de Bracket (Phase à Élimination Directe) ───────────────
// Gère l'arbre du tournoi des Seizièmes de finale jusqu'à la Finale.

const BRACKET_ROUNDS = [
  { id: "r32", name: "Seizièmes", count: 16 },
  { id: "r16", name: "Huitièmes", count: 8 },
  { id: "qf", name: "Quarts", count: 4 },
  { id: "sf", name: "Demi-finale", count: 2 },
  { id: "final", name: "Finale", count: 1 }
];

// Mapping tour → tour suivant
const NEXT_ROUND = { r32: "r16", r16: "qf", qf: "sf", sf: "final", final: null };

let bracketData = {};
let bracketMode = "desktop"; // "desktop" | "mobile"
let bracketSelectedRound = "r32"; // pour le mode mobile

// ── Constantes de hauteur ──────────────────────────────────
// Le contenu d'un slot R32 nécessite ~58px desktop / ~46px tablette
// (2×padding équipe + 2×police + bordures + padding slot)
const BASE_UNIT_DESKTOP = 60;  // hauteur d'un slot R32 en px (desktop)
const BASE_UNIT_TABLET  = 50;  // hauteur d'un slot R32 en px (tablette)

function getBaseUnit() {
  const w = window.innerWidth;
  if (w < 768) return BASE_UNIT_TABLET;
  if (w < 1025) return BASE_UNIT_TABLET;
  return BASE_UNIT_DESKTOP;
}

// ── Initialisation des données ─────────────────────────────
function initBracketData() {
  const ratings = window.ELO_RATINGS || {};
  const strMap = {};
  if (window.PREDICTIONS && window.PREDICTIONS.strengths) {
    window.PREDICTIONS.strengths.forEach(s => strMap[s.equipe] = s);
  }
  let clasificados = {
    winners: [],
    runners: [],
    thirds: []
  };

  Object.keys(GROUPES).forEach(g => {
    let teams = GROUPES[g].map(t => {
      let power = 1.0;
      if (strMap[t]) {
        power = strMap[t].attack_strength / Math.max(strMap[t].defense_weakness, 0.1);
      } else if (ratings[t]) {
        power = ratings[t] / 1500; // Normalisation approximative pour le fallback
      }
      return { name: t, power: power };
    });
    
    teams.sort((a, b) => b.power - a.power); // Trier par Power
    clasificados.winners.push({ ...teams[0], group: g, pos: 1 });
    clasificados.runners.push({ ...teams[1], group: g, pos: 2 });
    clasificados.thirds.push({ ...teams[2], group: g, pos: 3 });
  });

  clasificados.thirds.sort((a, b) => b.power - a.power);
  const bestThirds = clasificados.thirds.slice(0, 8);

  const getTeam = (group, pos) => {
    if (pos === 1) return clasificados.winners.find(t => t.group === group)?.name || "TBD";
    if (pos === 2) return clasificados.runners.find(t => t.group === group)?.name || "TBD";
    return "TBD";
  };

  const matchesR32 = [
    { id: "m1",  t1: getTeam("A", 1), t2: bestThirds[0]?.name || "3-1" },
    { id: "m2",  t1: getTeam("B", 2), t2: getTeam("C", 2) },
    { id: "m3",  t1: getTeam("D", 1), t2: bestThirds[1]?.name || "3-2" },
    { id: "m4",  t1: getTeam("E", 1), t2: getTeam("F", 2) },
    { id: "m5",  t1: getTeam("G", 1), t2: bestThirds[2]?.name || "3-3" },
    { id: "m6",  t1: getTeam("H", 2), t2: getTeam("I", 2) },
    { id: "m7",  t1: getTeam("J", 1), t2: bestThirds[3]?.name || "3-4" },
    { id: "m8",  t1: getTeam("K", 1), t2: getTeam("L", 2) },
    { id: "m9",  t1: getTeam("B", 1), t2: bestThirds[4]?.name || "3-5" },
    { id: "m10", t1: getTeam("A", 2), t2: getTeam("D", 2) },
    { id: "m11", t1: getTeam("C", 1), t2: bestThirds[5]?.name || "3-6" },
    { id: "m12", t1: getTeam("F", 1), t2: getTeam("E", 2) },
    { id: "m13", t1: getTeam("H", 1), t2: bestThirds[6]?.name || "3-7" },
    { id: "m14", t1: getTeam("G", 2), t2: getTeam("J", 2) },
    { id: "m15", t1: getTeam("I", 1), t2: bestThirds[7]?.name || "3-8" },
    { id: "m16", t1: getTeam("L", 1), t2: getTeam("K", 2) }
  ];

  bracketData.r32 = matchesR32.map(m => ({ ...m, w: null }));
  bracketData.r16 = Array.from({length: 8}, (_, i) => ({ id: `r16-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.qf  = Array.from({length: 4}, (_, i) => ({ id: `qf-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.sf  = Array.from({length: 2}, (_, i) => ({ id: `sf-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.final = [{ id: `final-1`, t1: null, t2: null, w: null }];
}

// ── Simulation complète ────────────────────────────────────
function simulateFullBracket(mode = 'data') {
  initBracketData();
  recomputeBracket(mode);
  renderBracket();
}

function recomputeBracket(mode = 'data') {
  BRACKET_ROUNDS.forEach(roundDef => {
    const roundId = roundDef.id;
    const matches = bracketData[roundId];

    matches.forEach((match, index) => {
      if (match.t1 && match.t2 && match.t1 !== "TBD" && match.t2 !== "TBD") {
        
        // Si l'utilisateur avait forcé un gagnant mais que l'équipe n'est plus là, on annule
        if (match.manualWinner && match.manualWinner !== match.t1 && match.manualWinner !== match.t2) {
          match.manualWinner = null;
        }

        let winner;
        if (match.manualWinner) {
          winner = match.manualWinner;
        } else if (mode === 'data') {
          const probs = getMatchProbabilities(match);
          const p = probs ? probs.prob1 : 0.5;
          
          // Simulation pondérée : on accentue la probabilité pour réduire les grosses surprises
          // Formule : p^3 / (p^3 + (1-p)^3)
          const steepP = Math.pow(p, 3) / (Math.pow(p, 3) + Math.pow(1 - p, 3));
          winner = Math.random() < steepP ? match.t1 : match.t2;
        } else {
          winner = Math.random() < 0.5 ? match.t1 : match.t2;
        }
        
        match.w = winner;
        propagateWinner(roundId, index, winner);
      } else {
        match.w = null;
      }
    });
  });
}

function propagateWinner(roundId, matchIndex, winner) {
  const nextRound = NEXT_ROUND[roundId];
  if (!nextRound) return;
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const isTeam1 = matchIndex % 2 === 0;
  if (isTeam1) bracketData[nextRound][nextMatchIndex].t1 = winner;
  else bracketData[nextRound][nextMatchIndex].t2 = winner;
}

// ── Sélection manuelle ─────────────────────────────────────
function manualSelectionHandler(round, matchIndex, winnerTeam) {
  bracketData[round][matchIndex].manualWinner = winnerTeam;
  recomputeBracket('data');
  renderBracket();
}

// ── Calcul partagé des probabilités ────────────────────
// Retourne { p1, p2, prob1 } ou null si les deux équipes ne sont pas définies.
function getMatchProbabilities(match) {
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
    const elo1 = ratings[match.t1] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
    const elo2 = ratings[match.t2] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
    const prob1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    const p1 = Math.round(prob1 * 100);
    return { p1, p2: 100 - p1, prob1 };
  }
}

// ── Création HTML d'un match (desktop) ─────────────────────
function createMatchHTML(match, round, index) {
  const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
  const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";

  const t1Name = match.t1 || "TBD";
  const t2Name = match.t2 || "TBD";

  const probs = getMatchProbabilities(match);
  const p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
  const p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";

  const onClickT1 = match.t1 ? `onclick="manualSelectionHandler('${round}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
  const onClickT2 = match.t2 ? `onclick="manualSelectionHandler('${round}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";

  return `
    <div class="bracket-match" data-round="${round}" data-index="${index}">
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
function renderBracketDesktop() {
  const container = document.getElementById("bracket-container");
  if (!container) return;

  const baseUnit = getBaseUnit();
  const totalHeight = 16 * baseUnit;

  let html = `<div class="bracket-scroll" id="bracket-desktop">`;
  html += `<div class="bracket-wrapper" style="position:relative; min-height:${totalHeight + 60}px;">`;
  html += `<canvas class="bracket-canvas" id="bracket-canvas"></canvas>`;

  BRACKET_ROUNDS.forEach(roundDef => {
    const matches = bracketData[roundDef.id];
    // Hauteur proportionnelle au nombre de matchs, mais jamais < baseUnit
    const slotHeight = Math.max((16 / matches.length) * baseUnit, baseUnit);

    html += `<div class="bracket-column" id="col-${roundDef.id}" style="flex:1; min-width:0;">`;
    html += `<h3 class="round-title">${roundDef.name}</h3>`;
    html += `<div class="bracket-col-slots" style="display:flex; flex-direction:column; justify-content:center; gap:4px;">`;

    matches.forEach((match, index) => {
      html += `<div class="bracket-slot" style="height:${slotHeight}px; display:flex; align-items:center; justify-content:center; padding:2px 0; overflow:hidden;">`;
      html += createMatchHTML(match, roundDef.id, index);
      html += `</div>`;
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  // Dessiner les connecteurs après le rendu
  requestAnimationFrame(() => {
    requestAnimationFrame(() => drawConnectors());
  });
}

// ── Dessin des connecteurs (Canvas) ────────────────────────
function drawConnectors() {
  const canvas = document.getElementById("bracket-canvas");
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

  // Parcourir tous les tours sauf la finale
  const drawRounds = ["r32", "r16", "qf", "sf"];

  drawRounds.forEach(roundId => {
    const col = document.getElementById(`col-${roundId}`);
    const nextRoundId = NEXT_ROUND[roundId];
    const nextCol = document.getElementById(`col-${nextRoundId}`);
    if (!col || !nextCol) return;

    const matches = col.querySelectorAll(".bracket-match");
    const nextMatches = nextCol.querySelectorAll(".bracket-match");

    matches.forEach((match, i) => {
      const nextIdx = Math.floor(i / 2);
      if (nextIdx >= nextMatches.length) return;

      const matchSlot = match.parentElement; // .bracket-slot
      const nextMatchSlot = nextMatches[nextIdx].parentElement;

      const mRect = match.getBoundingClientRect();
      const nmRect = nextMatches[nextIdx].getBoundingClientRect();

      // Point de sortie : milieu-droite du match courant
      const x1 = mRect.right - wrapperRect.left;
      const y1 = mRect.top + mRect.height / 2 - wrapperRect.top;

      // Point d'entrée : milieu-gauche du match suivant
      const x2 = nmRect.left - wrapperRect.left;
      const y2 = nmRect.top + nmRect.height / 2 - wrapperRect.top;

      const midX = x1 + (x2 - x1) * 0.55;

      // Couleur : or si vainqueur défini, sinon ligne discrète
      const matchData = bracketData[roundId]?.[i];
      const hasWinner = matchData?.w && matchData.w !== null;
      ctx.strokeStyle = hasWinner
        ? "rgba(240, 192, 64, 0.5)"
        : "rgba(122, 144, 168, 0.25)";
      ctx.lineWidth = hasWinner ? 2 : 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, y1);
      ctx.lineTo(midX, y2);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Petit cercle au point de jonction
      if (hasWinner) {
        ctx.fillStyle = "rgba(240, 192, 64, 0.6)";
        ctx.beginPath();
        ctx.arc(midX, y1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(midX, y2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });
}

// ── RENDU MOBILE (Round by Round) ──────────────────────────
function renderBracketMobile() {
  const container = document.getElementById("bracket-container");
  if (!container) return;

  const roundDef = BRACKET_ROUNDS.find(r => r.id === bracketSelectedRound) || BRACKET_ROUNDS[0];
  const matches = bracketData[roundDef.id] || [];

  // Onglets des tours
  let tabsHtml = `<div class="bracket-mobile-tabs">`;
  BRACKET_ROUNDS.forEach(r => {
    const active = r.id === bracketSelectedRound ? "active" : "";
    tabsHtml += `<button class="bracket-mobile-tab ${active}" onclick="selectBracketRound('${r.id}')">${r.name}</button>`;
  });
  tabsHtml += `</div>`;

  // Liste des matchs
  let matchesHtml = `<div class="bracket-mobile-matches">`;
  matches.forEach((match, index) => {
    const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
    const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";
    const t1Name = match.t1 || "TBD";
    const t2Name = match.t2 || "TBD";

    // Probabilités (fonction partagée avec createMatchHTML)
    const probs = getMatchProbabilities(match);
    const p1Text = probs ? ` <span class="bracket-prob">[${probs.p1}%]</span>` : "";
    const p2Text = probs ? ` <span class="bracket-prob">[${probs.p2}%]</span>` : "";

    const onClickT1 = match.t1 ? `onclick="manualSelectionHandler('${roundDef.id}', ${index}, '${match.t1.replace(/'/g, "\\'")}')"` : "";
    const onClickT2 = match.t2 ? `onclick="manualSelectionHandler('${roundDef.id}', ${index}, '${match.t2.replace(/'/g, "\\'")}')"` : "";

    // Indicateur de progression
    let progressIndicator = "";
    const nextRoundId = NEXT_ROUND[roundDef.id];
    if (nextRoundId) {
      const nextMatchIdx = Math.floor(index / 2);
      progressIndicator = `<div class="bracket-mobile-progress">
        <span class="progress-arrow">→</span>
        <span class="progress-label">${BRACKET_ROUNDS.find(r => r.id === nextRoundId)?.name || ""} #${nextMatchIdx + 1}</span>
      </div>`;
    }

    matchesHtml += `
      <div class="bracket-mobile-match-card">
        <div class="bracket-mobile-match-header">
          <span class="match-num">Match ${index + 1}</span>
          ${progressIndicator}
        </div>
        <div class="bracket-team ${t1Class}" ${onClickT1}>
          <span class="team-name">${t1Name}${p1Text}</span>
        </div>
        <div class="bracket-team ${t2Class}" ${onClickT2}>
          <span class="team-name">${t2Name}${p2Text}</span>
        </div>
      </div>
    `;
  });
  matchesHtml += `</div>`;

  container.innerHTML = `<div class="bracket-mobile" id="bracket-mobile">${tabsHtml}${matchesHtml}</div>`;
}

function selectBracketRound(roundId) {
  bracketSelectedRound = roundId;
  renderBracketMobile();
}

// ── Rendu principal (détection responsive) ─────────────────
function renderBracket() {
  const w = window.innerWidth;
  if (w < 768) {
    bracketMode = "mobile";
    renderBracketMobile();
  } else {
    bracketMode = "desktop";
    renderBracketDesktop();
  }
}

// ── Gestionnaire de redimensionnement ──────────────────────
let bracketResizeDebounce = null;
function handleBracketResize() {
  clearTimeout(bracketResizeDebounce);
  bracketResizeDebounce = setTimeout(() => {
    const newMode = window.innerWidth < 768 ? "mobile" : "desktop";
    if (newMode !== bracketMode) {
      bracketMode = newMode;
      bracketSelectedRound = "r32";
      renderBracket();
    } else if (bracketMode === "desktop") {
      // Redessiner le canvas
      requestAnimationFrame(() => {
        requestAnimationFrame(() => drawConnectors());
      });
    }
  }, 200);
}

// ── Initialisation du module ───────────────────────────────
function initBracketModule() {
  document.getElementById("btn-sim-random")?.addEventListener("click", () => {
    simulateFullBracket('random');
  });
  
  document.getElementById("btn-sim-data")?.addEventListener("click", () => {
    simulateFullBracket('data');
  });

  // Redessiner les connecteurs quand la fenêtre est redimensionnée
  window.addEventListener("resize", handleBracketResize);

  initBracketData();
  renderBracket();
}
