// ── Simulateur de Groupes ─────────────────────────────────
// Calcule les forces d'attaque / faiblesse défensive à partir
// des matchs RAW_H2H depuis 1990 (ère moderne du football).

const SIM_YEAR_MIN = 1990;

// ── Profils de force par défaut ───────────────────────────
// Utilisés quand une équipe n'a pas de données RAW_H2H >= 1990
const STRENGTH_PROFILES = {
  // Équipe avec un historique CM mais sans matchs indexés depuis 1990
  // → performances neutres légèrement en dessous de la moyenne
  veteran_no_data: { attack_strength: 0.90, defense_weakness: 1.10 },

  // Première Coupe du Monde (PJ === 0 dans RAW_STATS)
  // → clairement sous la moyenne : score peu, encaisse beaucoup
  debutant:        { attack_strength: 0.70, defense_weakness: 1.30 },
};

/**
 * Construit un strMap {equipe: {attack_strength, defense_weakness}}
 * en filtrant RAW_H2H sur l'ère moderne (>= SIM_YEAR_MIN).
 * Retourne aussi globalAvg et un Set des équipes débutantes.
 */
function buildStrengthsFrom1990(stats) {
  // Index des stats CM : permet de savoir si une équipe a joué des CM
  const statsMap = {};
  stats.forEach(s => statsMap[s.equipe] = s);

  // Filtrer les matchs >= 1990
  const matches = RAW_H2H.filter(m => parseInt(m.date.substring(0, 4)) >= SIM_YEAR_MIN);

  // Accumuler buts marqués / encaissés par équipe
  const teamData = {};
  const getTeam = (name) => {
    if (!teamData[name]) teamData[name] = { gf: 0, ga: 0, pj: 0 };
    return teamData[name];
  };

  let totalGoals   = 0;
  let totalMatches = 0;

  matches.forEach(m => {
    const goalsH = m.home_score ?? 0;
    const goalsA = m.away_score ?? 0;

    getTeam(m.home_team).gf += goalsH;
    getTeam(m.home_team).ga += goalsA;
    getTeam(m.home_team).pj++;

    getTeam(m.away_team).gf += goalsA;
    getTeam(m.away_team).ga += goalsH;
    getTeam(m.away_team).pj++;

    totalGoals   += goalsH + goalsA;
    totalMatches += 1;
  });

  // Moyenne globale de buts par équipe par match (ère moderne)
  const globalAvg = totalMatches > 0 ? (totalGoals / (totalMatches * 2)) : 1.3;

  // Construire le strMap avec les forces calculées
  const strMap = {};
  Object.entries(teamData).forEach(([team, d]) => {
    if (d.pj < 3) return;  // Ignorer les équipes avec < 3 matchs (bruit)
    strMap[team] = {
      attack_strength:  (d.gf / d.pj) / globalAvg,
      defense_weakness: (d.ga / d.pj) / globalAvg,
      matches_played:   d.pj,
      source:           'calculated'
    };
  });

  // Compléter les équipes manquantes avec le bon profil
  Object.keys(statsMap).forEach(equipe => {
    if (strMap[equipe]) return; // Déjà calculé
    const cmStats = statsMap[equipe];
    if (cmStats && cmStats.PJ === 0) {
      // Vrai débutant : jamais joué en Coupe du Monde
      strMap[equipe] = { ...STRENGTH_PROFILES.debutant, matches_played: 0, source: 'debutant' };
    } else {
      // A joué des CM mais pas de données RAW_H2H depuis 1990
      strMap[equipe] = { ...STRENGTH_PROFILES.veteran_no_data, matches_played: cmStats?.PJ ?? 0, source: 'veteran_no_data' };
    }
  });

  return { strMap, globalAvg };
}

// Labels lisibles pour la légende de la source
const SOURCE_LABELS = {
  calculated:       { icon: '📊', title: 'Calculé sur matchs 1990+' },
  veteran_no_data:  { icon: '📁', title: 'Historique CM, données limitées depuis 1990' },
  debutant:         { icon: '🆕', title: 'Première Coupe du Monde — force estimée' },
};

function renderSimulador(stats) {
  const simSelect = document.getElementById("sim-group-select");
  if (!simSelect) return;

  Object.keys(GROUPES).sort().forEach(g => {
    simSelect.innerHTML += `<option value="${g}">Groupe ${g}</option>`;
  });

  // Calcul des forces depuis 1990 (une seule fois au chargement)
  const { strMap, globalAvg } = buildStrengthsFrom1990(stats);

  const simPoisson = (lambda) => {
    let L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };

  const btnSim = document.getElementById("btn-simular-grupo");
  if (!btnSim) return;

  btnSim.onclick = () => {
    const group = simSelect.value;
    const teams = GROUPES[group];

    let standings = teams.map(t => ({ equipe: t, pts: 0, pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const tA   = teams[i];
        const tB   = teams[j];
        // Utiliser le profil approprié (calculé, vétéran sans data, ou débutant)
        const strA = strMap[tA] || { ...STRENGTH_PROFILES.debutant };
        const strB = strMap[tB] || { ...STRENGTH_PROFILES.debutant };

        const xgA    = strA.attack_strength * strB.defense_weakness * globalAvg;
        const xgB    = strB.attack_strength * strA.defense_weakness * globalAvg;
        const goalsA = simPoisson(xgA);
        const goalsB = simPoisson(xgB);

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
    const table = document.getElementById("simTable");
    table.innerHTML = `<thead><tr>
      <th>Pos</th><th>Équipe</th>
      <th class="r">PJ</th><th class="r">V</th><th class="r">E</th><th class="r">D</th>
      <th class="r">GF</th><th class="r">GC</th><th class="r">DG</th><th class="r">Pts</th>
    </tr></thead><tbody>`;

    standings.forEach((s, idx) => {
      const isClassified = idx < 2;
      const styleCls  = isClassified ? 'style="background:rgba(74,222,128,0.1);"' : '';
      const rankColor = isClassified ? 'color:var(--green);' : 'color:var(--muted);';
      const dgColor   = s.gd > 0 ? '#22c55e' : (s.gd < 0 ? '#ef4444' : '#7a90a8');
      const dgVal     = s.gd > 0 ? '+' + s.gd : s.gd;

      // Icône selon la source des données
      const src   = strMap[s.equipe]?.source || 'debutant';
      const badge = SOURCE_LABELS[src];
      const icon  = `<span title="${badge.title}" style="margin-left:4px;font-size:11px;cursor:help;">${badge.icon}</span>`;

      table.innerHTML += `<tr ${styleCls}>
        <td><span class="rank-num" style="${rankColor}">${idx + 1}</span></td>
        <td><span style="font-weight:600">${s.equipe}</span>${icon}</td>
        <td class="r">${s.pj}</td><td class="r">${s.w}</td><td class="r">${s.d}</td><td class="r">${s.l}</td>
        <td class="r">${s.gf}</td><td class="r">${s.ga}</td>
        <td class="r" style="color:${dgColor}">${dgVal}</td>
        <td class="r" style="font-weight:700;color:var(--gold);">${s.pts}</td>
      </tr>`;
    });
    table.innerHTML += "</tbody>";
  };
}
