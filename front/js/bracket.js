// ── Simulateur de Bracket (Phase à Élimination Directe) ───────────────
// Gère l'arbre du tournoi des Seizièmes de finale jusqu'à la Finale.

const BRACKET_ROUNDS = [
  { id: "r32", name: "Seizièmes" },
  { id: "r16", name: "Huitièmes" },
  { id: "qf", name: "Quarts" },
  { id: "sf", name: "Demi-finale" },
  { id: "final", name: "Finale" }
];

let bracketData = {};

// Initialise le bracket avec les équipes qui passent la phase de groupes
function initBracketData() {
  const ratings = window.ELO_RATINGS || {};
  
  // 1. Simuler les positions de groupes basées sur l'ELO pour obtenir les qualifiés
  let clasificados = {
    winners: [],
    runners: [],
    thirds: []
  };

  Object.keys(GROUPES).forEach(g => {
    let teams = GROUPES[g].map(t => ({ name: t, elo: ratings[t] || ELO_DEBUTANT }));
    teams.sort((a, b) => b.elo - a.elo); // Trier par Elo (simulation rapide)
    clasificados.winners.push({ ...teams[0], group: g, pos: 1 });
    clasificados.runners.push({ ...teams[1], group: g, pos: 2 });
    clasificados.thirds.push({ ...teams[2], group: g, pos: 3 });
  });

  // Trier les troisièmes places pour prendre les 8 meilleurs
  clasificados.thirds.sort((a, b) => b.elo - a.elo);
  const bestThirds = clasificados.thirds.slice(0, 8);

  // Helper pour chercher l'équipe par groupe et position
  const getTeam = (group, pos) => {
    if (pos === 1) return clasificados.winners.find(t => t.group === group)?.name || "TBD";
    if (pos === 2) return clasificados.runners.find(t => t.group === group)?.name || "TBD";
    return "TBD";
  };

  // Croisements Logiques pour 48 équipes (12 groupes, 32 qualifiés)
  const matchesR32 = [
    // Côté Gauche
    { id: "m1", t1: getTeam("A", 1), t2: bestThirds[0]?.name || "3-1" },
    { id: "m2", t1: getTeam("B", 2), t2: getTeam("C", 2) },
    { id: "m3", t1: getTeam("D", 1), t2: bestThirds[1]?.name || "3-2" },
    { id: "m4", t1: getTeam("E", 1), t2: getTeam("F", 2) },
    { id: "m5", t1: getTeam("G", 1), t2: bestThirds[2]?.name || "3-3" },
    { id: "m6", t1: getTeam("H", 2), t2: getTeam("I", 2) },
    { id: "m7", t1: getTeam("J", 1), t2: bestThirds[3]?.name || "3-4" },
    { id: "m8", t1: getTeam("K", 1), t2: getTeam("L", 2) },
    // Côté Droit
    { id: "m9", t1: getTeam("B", 1), t2: bestThirds[4]?.name || "3-5" },
    { id: "m10", t1: getTeam("A", 2), t2: getTeam("D", 2) },
    { id: "m11", t1: getTeam("C", 1), t2: bestThirds[5]?.name || "3-6" },
    { id: "m12", t1: getTeam("F", 1), t2: getTeam("E", 2) },
    { id: "m13", t1: getTeam("H", 1), t2: bestThirds[6]?.name || "3-7" },
    { id: "m14", t1: getTeam("G", 2), t2: getTeam("J", 2) },
    { id: "m15", t1: getTeam("I", 1), t2: bestThirds[7]?.name || "3-8" },
    { id: "m16", t1: getTeam("L", 1), t2: getTeam("K", 2) }
  ];

  bracketData.r32 = matchesR32.map(m => ({ ...m, w: null }));
  
  // Initialiser les tours vides
  bracketData.r16 = Array.from({length: 8}, (_, i) => ({ id: `r16-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.qf = Array.from({length: 4}, (_, i) => ({ id: `qf-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.sf = Array.from({length: 2}, (_, i) => ({ id: `sf-${i+1}`, t1: null, t2: null, w: null }));
  bracketData.final = [{ id: `final-1`, t1: null, t2: null, w: null }];
}

function simulateFullBracket() {
  initBracketData(); // Réinitialiser le point de départ
  
  BRACKET_ROUNDS.forEach(roundDef => {
    const roundId = roundDef.id;
    const matches = bracketData[roundId];
    
    matches.forEach((match, index) => {
      if (match.t1 && match.t2 && match.t1 !== "TBD" && match.t2 !== "TBD") {
        const ratings = window.ELO_RATINGS || {};
        const elo1 = ratings[match.t1] || ELO_DEBUTANT;
        const elo2 = ratings[match.t2] || ELO_DEBUTANT;
        const prob1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
        
        // Simulation pondérée
        const winner = Math.random() < prob1 ? match.t1 : match.t2;
        bracketData[roundId][index].w = winner;
        
        let nextRound, nextMatchIndex, isTeam1;
        if (roundId === "r32") { nextRound = "r16"; nextMatchIndex = Math.floor(index / 2); isTeam1 = index % 2 === 0; }
        else if (roundId === "r16") { nextRound = "qf"; nextMatchIndex = Math.floor(index / 2); isTeam1 = index % 2 === 0; }
        else if (roundId === "qf") { nextRound = "sf"; nextMatchIndex = Math.floor(index / 2); isTeam1 = index % 2 === 0; }
        else if (roundId === "sf") { nextRound = "final"; nextMatchIndex = 0; isTeam1 = index % 2 === 0; }
        
        if (nextRound) {
          if (isTeam1) bracketData[nextRound][nextMatchIndex].t1 = winner;
          else bracketData[nextRound][nextMatchIndex].t2 = winner;
        }
      }
    });
  });
  
  renderBracket();
}

function manualSelectionHandler(round, matchIndex, winnerTeam) {
  bracketData[round][matchIndex].w = winnerTeam;

  let nextRound, nextMatchIndex, isTeam1;
  if (round === "r32") { nextRound = "r16"; nextMatchIndex = Math.floor(matchIndex / 2); isTeam1 = matchIndex % 2 === 0; }
  else if (round === "r16") { nextRound = "qf"; nextMatchIndex = Math.floor(matchIndex / 2); isTeam1 = matchIndex % 2 === 0; }
  else if (round === "qf") { nextRound = "sf"; nextMatchIndex = Math.floor(matchIndex / 2); isTeam1 = matchIndex % 2 === 0; }
  else if (round === "sf") { nextRound = "final"; nextMatchIndex = 0; isTeam1 = matchIndex % 2 === 0; }
  else return; // Finale terminée

  if (isTeam1) {
    bracketData[nextRound][nextMatchIndex].t1 = winnerTeam;
  } else {
    bracketData[nextRound][nextMatchIndex].t2 = winnerTeam;
  }

  // Si le gagnant change, il faut nettoyer les tours suivants pour cet emplacement
  clearSubsequentRounds(nextRound, nextMatchIndex, isTeam1);

  renderBracket();
}

function clearSubsequentRounds(round, matchIndex, isTeam1) {
  let r = round;
  let idx = matchIndex;
  
  while (r !== "final") {
    bracketData[r][idx].w = null;
    let nextR = r === "r16" ? "qf" : r === "qf" ? "sf" : "final";
    let nextIdx = Math.floor(idx / 2);
    let nextIsTeam1 = idx % 2 === 0;
    
    if (nextIsTeam1) bracketData[nextR][nextIdx].t1 = null;
    else bracketData[nextR][nextIdx].t2 = null;
    
    r = nextR;
    idx = nextIdx;
  }
  bracketData["final"][0].w = null;
}

function createMatchHTML(match, round, index) {
  const t1Class = match.w === match.t1 && match.t1 ? "winner" : "";
  const t2Class = match.w === match.t2 && match.t2 ? "winner" : "";
  
  const t1Name = match.t1 || "TBD";
  const t2Name = match.t2 || "TBD";
  
  let p1Text = "";
  let p2Text = "";
  
  if (match.t1 && match.t2 && match.t1 !== "TBD" && match.t2 !== "TBD") {
    const ratings = window.ELO_RATINGS || {};
    const elo1 = ratings[match.t1] || 1200;
    const elo2 = ratings[match.t2] || 1200;
    const p1 = Math.round((1 / (1 + Math.pow(10, (elo2 - elo1) / 400))) * 100);
    const p2 = 100 - p1;
    
    p1Text = ` <span style="font-size:10.5px; color:var(--gold); margin-left:6px; opacity:0.8;">[${p1}%]</span>`;
    p2Text = ` <span style="font-size:10.5px; color:var(--gold); margin-left:6px; opacity:0.8;">[${p2}%]</span>`;
  }
  
  const onClickT1 = match.t1 ? `onclick="manualSelectionHandler('${round}', ${index}, '${match.t1}')"` : "";
  const onClickT2 = match.t2 ? `onclick="manualSelectionHandler('${round}', ${index}, '${match.t2}')"` : "";

  return `
    <div class="bracket-match">
      <div class="bracket-team ${t1Class}" ${onClickT1}>
        <span class="team-name">${t1Name}${p1Text}</span>
      </div>
      <div class="bracket-team ${t2Class}" ${onClickT2}>
        <span class="team-name">${t2Name}${p2Text}</span>
      </div>
    </div>
  `;
}

function renderBracket() {
  const container = document.getElementById("bracket-container");
  if (!container) return;

  let html = `<div class="bracket-scroll"><div class="bracket-wrapper">`;
  
  BRACKET_ROUNDS.forEach(roundDef => {
    html += `<div class="bracket-column" id="col-${roundDef.id}">`;
    html += `<h3 class="round-title">${roundDef.name}</h3>`;
    
    const matches = bracketData[roundDef.id];
    matches.forEach((match, index) => {
      html += createMatchHTML(match, roundDef.id, index);
    });
    
    html += `</div>`;
  });
  
  html += `</div></div>`;
  container.innerHTML = html;
}

function initBracketModule() {
  document.getElementById("btn-reset-bracket")?.addEventListener("click", () => {
    simulateFullBracket();
  });
  
  initBracketData();
  renderBracket();
}
