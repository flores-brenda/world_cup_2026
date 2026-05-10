// ── Face à Face (H2H) avec Elo ────────────────────────────
let h2hChart = null;

function renderH2H(stats) {
  const selectA = document.getElementById("h2h-teamA-select");
  const selectB = document.getElementById("h2h-teamB-select");
  if (!selectA || !selectB) return;

  const teams = stats.map(s => s.equipe).sort();
  teams.forEach(t => {
    selectA.innerHTML += `<option value="${t}">${t}</option>`;
    selectB.innerHTML += `<option value="${t}">${t}</option>`;
  });
  if (teams.includes("Mexico"))        selectA.value = "Mexico";
  if (teams.includes("United States")) selectB.value = "United States";

  // Elo ratings globaux (calculés par main.js)
  const ratings   = window.ELO_RATINGS   || {};
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;

  const updateH2H = () => {
    const tA = selectA.value;
    const tB = selectB.value;
    if (tA === tB) return;

    // ── Matchs historiques ────────────────────────────────
    const matches = RAW_H2H
      .filter(m =>
        (m.home_team === tA && m.away_team === tB) ||
        (m.home_team === tB && m.away_team === tA)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    document.getElementById("h2h-results").style.display = "grid";
    document.getElementById("h2h-total").textContent = matches.length;

    let winsA = 0, winsB = 0, draws = 0;
    matches.forEach(m => {
      if (m.home_score === m.away_score) draws++;
      else if (m.home_team === tA && m.home_score > m.away_score) winsA++;
      else if (m.away_team === tA && m.away_score > m.home_score) winsA++;
      else winsB++;
    });

    // ── Doughnut historique ───────────────────────────────
    if (h2hChart) h2hChart.destroy();
    const ctx = document.getElementById("chartH2H").getContext("2d");
    h2hChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [`Victoires ${tA}`, "Matchs nuls", `Victoires ${tB}`],
        datasets: [{
          data: [winsA, draws, winsB],
          backgroundColor: ["#4ade80", "#f0c040", "#f87171"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { color: "#e8eef6" } } },
        cutout: "65%"
      }
    });

    // ── Panneau Elo + probabilités ────────────────────────
    const eloA = Math.round(ratings[tA] || ELO_DEBUTANT);
    const eloB = Math.round(ratings[tB] || ELO_DEBUTANT);

    // Probabilités Monte Carlo basées sur Elo (500 simulations rapides)
    const probs = eloProbabilities(eloA, eloB, globalAvg, 500);

    // Chercher ou créer le panneau Elo sous le doughnut
    let eloPanel = document.getElementById("h2h-elo-panel");
    if (!eloPanel) {
      eloPanel = document.createElement("div");
      eloPanel.id = "h2h-elo-panel";
      // Insérer après la carte du graphique H2H
      const chartCard = document.getElementById("chartH2H").closest(".card") ||
                        document.getElementById("chartH2H").parentElement;
      chartCard.appendChild(eloPanel);
    }

    eloPanel.innerHTML = `
      <div style="margin-top:20px; padding:16px; background:rgba(255,255,255,0.04);
                  border-radius:12px; border:1px solid var(--border);">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px;
                    color:var(--muted); margin-bottom:14px;">
          🎯 Analyse Elo — Probabilités pour un match hypothétique
        </div>

        <!-- Comparaison Elo -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px;">
          <div style="text-align:center; flex:1;">
            <div style="font-weight:700; font-size:18px; color:${eloColor(eloA)};">${eloA}</div>
            <div style="font-size:11px; color:var(--muted);">${eloLabel(eloA)}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">${tA}</div>
          </div>
          <div style="font-size:22px; color:var(--muted);">⚔️</div>
          <div style="text-align:center; flex:1;">
            <div style="font-weight:700; font-size:18px; color:${eloColor(eloB)};">${eloB}</div>
            <div style="font-size:11px; color:var(--muted);">${eloLabel(eloB)}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">${tB}</div>
          </div>
        </div>

        <!-- Barre de probabilités -->
        <div style="display:flex; height:28px; border-radius:6px; overflow:hidden; margin-bottom:10px;">
          <div style="width:${probs.probA}%; background:#4ade80; display:flex; align-items:center;
                      justify-content:center; font-size:11px; font-weight:700; color:#0f2a1d;
                      transition:width 0.5s;">${probs.probA}%</div>
          <div style="width:${probs.probD}%; background:#f0c040; display:flex; align-items:center;
                      justify-content:center; font-size:11px; font-weight:700; color:#3a2800;
                      transition:width 0.5s;">${probs.probD}%</div>
          <div style="width:${probs.probB}%; background:#f87171; display:flex; align-items:center;
                      justify-content:center; font-size:11px; font-weight:700; color:#3a0000;
                      transition:width 0.5s;">${probs.probB}%</div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted);">
          <span>Victoire ${tA}</span>
          <span>Match nul</span>
          <span>Victoire ${tB}</span>
        </div>

        <!-- Note méthodologie -->
        <div style="margin-top:12px; font-size:10px; color:var(--muted); opacity:0.7;">
          Basé sur ${matches.length} rencontre${matches.length !== 1 ? 's' : ''} historique${matches.length !== 1 ? 's' : ''} ·
          Elo calculé sur matchs RAW_H2H depuis 1990 · Simulation Monte Carlo 500 itérations
        </div>
      </div>`;

    // ── Timeline des 10 derniers matchs ───────────────────
    const timelineCard = document.getElementById("h2h-timeline-card");
    const timeline     = document.getElementById("h2h-timeline");
    if (matches.length > 0 && timelineCard && timeline) {
      timelineCard.style.display = "block";
      timeline.innerHTML = '<div style="position:absolute; top:50%; left:5%; right:5%; height:2px; background:var(--border); z-index:0;"></div>';
      matches.slice(0, 10).forEach(m => {
        let color = "#f0c040";
        if (m.home_score !== m.away_score) {
          const winner = m.home_score > m.away_score ? m.home_team : m.away_team;
          color = winner === tA ? "#4ade80" : "#f87171";
        }
        const date  = m.date.substring(0, 4);
        const score = m.home_team === tA
          ? `${m.home_score} - ${m.away_score}`
          : `${m.away_score} - ${m.home_score}`;
        timeline.innerHTML += `
          <div style="position:relative; z-index:1; display:flex; flex-direction:column;
                      align-items:center; cursor:pointer;" title="${m.date} — ${m.tournament}">
            <div style="font-size:10px; color:var(--muted); margin-bottom:6px;">${date}</div>
            <div style="width:16px; height:16px; border-radius:50%; background:${color};
                        border:3px solid var(--surface); box-shadow:0 0 0 1px ${color}; transition:0.2s;"
                 onmouseover="this.style.transform='scale(1.3)'"
                 onmouseout="this.style.transform='scale(1)'"></div>
            <div style="font-size:12px; font-weight:bold; margin-top:6px; color:white;">${score}</div>
          </div>`;
      });
    } else if (timelineCard) {
      timelineCard.style.display = "none";
    }
  };

  selectA.addEventListener("change", updateH2H);
  selectB.addEventListener("change", updateH2H);
  updateH2H();
}
