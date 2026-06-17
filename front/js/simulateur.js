// ── Simulateur de Groupes (Elo + Poisson + Dixon-Coles) ────
// Utilise les Elo ratings calculés par elo.js pour simuler
// la phase de groupes avec des probabilités réalistes.
// La correction Dixon-Coles est appliquée pour simuler les
// scores avec une fréquence d'empates plus fidèle à la réalité.

function renderSimulador(stats) {
  const simSelect = document.getElementById("sim-group-select");
  if (!simSelect) return;

  Object.keys(GROUPES).sort().forEach(g => {
    simSelect.innerHTML += `<option value="${g}">Groupe ${g}</option>`;
  });

  // Récupérer les Elo globaux (calculés dans main.js via initElo)
  const ratings   = window.ELO_RATINGS   || {};
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;

  const btnSim = document.getElementById("btn-simular-grupo");
  if (!btnSim) return;

  btnSim.onclick = () => {
    const group = simSelect.value;
    const teams = GROUPES[group];

    let standings = teams.map(t => ({
      equipe: t, pts: 0, pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
    }));

    // Simuler tous les matchs du groupe (round-robin)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const tA   = teams[i];
        const tB   = teams[j];

        // Elo de chaque équipe (débutant si absent)
        const eloA = ratings[tA] || ELO_DEBUTANT;
        const eloB = ratings[tB] || ELO_DEBUTANT;

        // xG dérivé du différentiel Elo + simulation DC
        const { xgA, xgB } = eloToXG(eloA, eloB, globalAvg);
        const [goalsA, goalsB] = simDixonColesGoals(xgA, xgB);

        const sA = standings.find(s => s.equipe === tA);
        const sB = standings.find(s => s.equipe === tB);

        sA.pj++; sB.pj++;
        sA.gf += goalsA; sB.gf += goalsB;
        sA.ga += goalsB; sB.ga += goalsA;
        sA.gd = sA.gf - sA.ga;
        sB.gd = sB.gf - sB.ga;

        if      (goalsA > goalsB) { sA.pts += 3; sA.w++; sB.l++; }
        else if (goalsA < goalsB) { sB.pts += 3; sB.w++; sA.l++; }
        else                      { sA.pts += 1; sB.pts += 1; sA.d++; sB.d++; }
      }
    }

    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    document.getElementById("sim-results").style.display = "block";

    // ── En-tête Elo des équipes du groupe ──────────────────
    let eloHeader = `<div class="elo-badges">`;
    teams.slice().sort((a, b) => (ratings[b] || ELO_DEBUTANT) - (ratings[a] || ELO_DEBUTANT))
      .forEach(t => {
        const elo = Math.round(ratings[t] || ELO_DEBUTANT);
        const col = eloColor(elo);
        const lbl = eloLabel(elo);
        eloHeader += `
          <div class="elo-badge-item" style="border:1px solid ${col}22;">
            <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0;"></span>
            <span style="font-weight:600;">${t}</span>
            <span style="color:${col};font-weight:700;">${elo}</span>
            <span style="color:var(--muted);font-size:10px;">${lbl}</span>
          </div>`;
      });
    eloHeader += `</div>`;

    // Injecter l'en-tête Elo avant le tableau
    let eloDiv = document.getElementById("sim-elo-header");
    if (!eloDiv) {
      eloDiv = document.createElement("div");
      eloDiv.id = "sim-elo-header";
      const resultsDiv = document.getElementById("sim-results");
      resultsDiv.insertBefore(eloDiv, resultsDiv.firstChild);
    }
    eloDiv.innerHTML = eloHeader;

    // ── Tableau de classement ──────────────────────────────
    const table = document.getElementById("simTable");
    // Ajouter wrapper scrollable si pas déjà présent
    let simScrollWrapper = table.closest('.table-scroll');
    if (!simScrollWrapper) {
      simScrollWrapper = document.createElement('div');
      simScrollWrapper.className = 'table-scroll';
      table.parentNode.insertBefore(simScrollWrapper, table);
      simScrollWrapper.appendChild(table);
    }
    table.innerHTML = `<thead><tr>
      <th>Pos</th><th>Équipe</th><th>Elo</th>
      <th class="r">PJ</th><th class="r">V</th><th class="r">E</th><th class="r">D</th>
      <th class="r">GF</th><th class="r">GC</th><th class="r">DG</th><th class="r">Pts</th>
    </tr></thead><tbody>`;

    standings.forEach((s, idx) => {
      const isClassified = idx < 2;
      const styleCls     = isClassified ? 'style="background:rgba(74,222,128,0.1);"' : '';
      const rankColor    = isClassified ? 'color:var(--green);' : 'color:var(--muted);';
      const dgColor      = s.gd > 0 ? '#22c55e' : (s.gd < 0 ? '#ef4444' : '#7a90a8');
      const dgVal        = s.gd > 0 ? '+' + s.gd : s.gd;
      const elo          = Math.round(ratings[s.equipe] || ELO_DEBUTANT);
      const eloBadge     = `<span style="color:${eloColor(elo)};font-weight:700;font-size:12px;">${elo}</span>`;

      table.innerHTML += `<tr ${styleCls}>
        <td><span class="rank-num" style="${rankColor}">${idx + 1}</span></td>
        <td><span style="font-weight:600">${s.equipe}</span></td>
        <td>${eloBadge}</td>
        <td class="r">${s.pj}</td><td class="r">${s.w}</td>
        <td class="r">${s.d}</td><td class="r">${s.l}</td>
        <td class="r">${s.gf}</td><td class="r">${s.ga}</td>
        <td class="r" style="color:${dgColor}">${dgVal}</td>
        <td class="r" style="font-weight:700;color:var(--gold);">${s.pts}</td>
      </tr>`;
    });
    table.innerHTML += "</tbody>";
  };
}
