// ══════════════════════════════════════════════════════════
// MONTE CARLO — Simulación Completa del Torneo FIFA 2026
// Corre N simulaciones del Mundial completo y acumula
// probabilidades de campeón, finalista, semifinalista, etc.
// Reutiliza: eloToXG, simDixonColesGoals, simPoissonGoals (elo.js)
//            GROUPES, ELO_RATINGS, ELO_GLOBAL_AVG (script.js / main.js)
// ══════════════════════════════════════════════════════════

const MC_SIMULATIONS   = 10000;  // Número de simulaciones
const MC_BATCH_SIZE    = 500;    // Partidas por batch (no bloquea UI)

// Estructura del bracket R32 (reutiliza la lógica de bracket.js)
// matchesR32[i] = [posición grupo A, posición grupo B]
// pos: "1X" = winner del grupo X, "2X" = runner-up, "3" = tercer lugar
const MC_R32_TEMPLATE = [
  ["1A", "3-1"], ["2B", "2C"], ["1D", "3-2"], ["1E", "2F"],
  ["1G", "3-3"], ["2H", "2I"], ["1J", "3-4"], ["1K", "2L"],
  ["1B", "3-5"], ["2A", "2D"], ["1C", "3-6"], ["1F", "2E"],
  ["1H", "3-7"], ["2G", "2J"], ["1I", "3-8"], ["1L", "2K"]
];

// ─── Motor de simulación ──────────────────────────────────

/**
 * Simula todos los partidos de la fase de grupos.
 * Devuelve un objeto { winners, runners, thirds } con los clasificados.
 */
function mcSimulateGroups(ratings, globalAvg) {
  const winners = {}, runners = {}, allThirds = [];

  Object.keys(GROUPES).sort().forEach(g => {
    const teams = GROUPES[g];
    const table = teams.map(t => ({
      name: t, pts: 0, gd: 0, gf: 0
    }));

    // Round-robin: todos contra todos
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const eloA = ratings[teams[i]] || ELO_DEBUTANT;
        const eloB = ratings[teams[j]] || ELO_DEBUTANT;
        const { xgA, xgB } = eloToXG(eloA, eloB, globalAvg);
        const [gA, gB] = simDixonColesGoals(xgA, xgB);

        const sA = table[i], sB = table[j];
        sA.gf += gA; sB.gf += gB;
        sA.gd += (gA - gB); sB.gd += (gB - gA);
        if      (gA > gB) { sA.pts += 3; }
        else if (gA < gB) { sB.pts += 3; }
        else               { sA.pts += 1; sB.pts += 1; }
      }
    }

    // Ordenar por puntos → DG → GF
    table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    winners[g] = table[0];
    runners[g] = table[1];
    allThirds.push({ ...table[2], group: g });
  });

  // Seleccionar los 8 mejores terceros
  allThirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const bestThirds = allThirds.slice(0, 8);

  return { winners, runners, thirds: bestThirds };
}

/**
 * Resuelve una posición del bracket ("1A", "2B", "3-1") a un nombre de equipo.
 */
function mcResolveSlot(slot, winners, runners, thirds) {
  if (slot.startsWith('1')) return winners[slot[1]]?.name || 'TBD';
  if (slot.startsWith('2')) return runners[slot[1]]?.name || 'TBD';
  if (slot.startsWith('3-')) {
    const idx = parseInt(slot.split('-')[1]) - 1;
    return thirds[idx]?.name || 'TBD';
  }
  return 'TBD';
}

/**
 * Simula un partido de eliminatoria (sin empate posible al final).
 * Si hay empate a 90', se va a penaltis: P(A gana penaltis) ∝ Elo relativo.
 * Devuelve el nombre del ganador.
 */
function mcSimulateKOMatch(teamA, teamB, ratings, globalAvg) {
  if (typeof simKnockoutMatch === 'function') {
    return simKnockoutMatch(teamA, teamB, ratings, globalAvg);
  }
  // Fallback simple
  const eloA = ratings[teamA] || 1200;
  const eloB = ratings[teamB] || 1200;
  const probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return Math.random() < probA ? teamA : teamB;
}

/**
 * Corre UNA simulación completa del torneo.
 * Devuelve un objeto { champion, finalist, [sf], [qf] } con nombres de equipos.
 */
function mcRunOneTournament(ratings, globalAvg) {
  const { winners, runners, thirds } = mcSimulateGroups(ratings, globalAvg);

  // Construir bracket R32
  let currentRound = MC_R32_TEMPLATE.map(([s1, s2]) => ({
    t1: mcResolveSlot(s1, winners, runners, thirds),
    t2: mcResolveSlot(s2, winners, runners, thirds)
  }));

  const sfTeams = [], qfTeams = [];
  let finalist1, finalist2, champion;

  // Rondas de knockout: R32 → R16 → QF → SF → Final
  const rounds = ['r32', 'r16', 'qf', 'sf', 'final'];
  for (const round of rounds) {
    const nextRound = [];
    for (const match of currentRound) {
      if (!match.t1 || !match.t2 || match.t1 === 'TBD' || match.t2 === 'TBD') {
        nextRound.push(match.t1 || match.t2 || 'TBD');
        continue;
      }
      const winner = mcSimulateKOMatch(match.t1, match.t2, ratings, globalAvg);
      nextRound.push(winner);

      // Acumular stats por ronda
      if (round === 'qf')    { qfTeams.push(match.t1, match.t2); }
      if (round === 'sf')    { sfTeams.push(match.t1, match.t2); }
      if (round === 'final') {
        finalist1 = match.t1; finalist2 = match.t2;
        champion  = winner;
      }
    }

    // Emparejar ganadores para la siguiente ronda
    if (round !== 'final') {
      currentRound = [];
      for (let i = 0; i < nextRound.length; i += 2) {
        currentRound.push({ t1: nextRound[i], t2: nextRound[i + 1] || 'TBD' });
      }
    }
  }

  return { champion, finalist1, finalist2, sfTeams, qfTeams };
}

// ─── Acumulador y runner principal ───────────────────────

let mcResults = null;  // { champion, finalist, sf, qf } por equipo

/**
 * Corre MC_SIMULATIONS simulaciones en batches para no bloquear el UI.
 * Actualiza la barra de progreso y llama a onComplete al terminar.
 */
function runMonteCarlo(onProgress, onComplete) {
  const ratings   = window.ELO_RATINGS   || {};
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;

  const counts = {};   // { team: { champion, finalist, sf, qf } }
  const initTeam = t => {
    if (!counts[t]) counts[t] = { champion: 0, finalist: 0, sf: 0, qf: 0 };
  };

  let done = 0;

  function runBatch() {
    const end = Math.min(done + MC_BATCH_SIZE, MC_SIMULATIONS);
    for (let s = done; s < end; s++) {
      const { champion, finalist1, finalist2, sfTeams, qfTeams } = mcRunOneTournament(ratings, globalAvg);

      if (champion) { initTeam(champion); counts[champion].champion++; }
      [finalist1, finalist2].forEach(t => { if (t) { initTeam(t); counts[t].finalist++; } });
      sfTeams.forEach(t => { initTeam(t); counts[t].sf++; });
      qfTeams.forEach(t => { initTeam(t); counts[t].qf++; });
    }
    done = end;
    onProgress(done / MC_SIMULATIONS);

    if (done < MC_SIMULATIONS) {
      setTimeout(runBatch, 0);  // Cede control al browser
    } else {
      mcResults = counts;
      onComplete(counts);
    }
  }

  runBatch();
}

// ─── Renderizado ─────────────────────────────────────────

function renderMonteCarlo() {
  const container = document.getElementById('mc-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding: 40px 20px;">
      <div style="font-size:64px; margin-bottom:16px;">🎲</div>
      <div style="font-family:'Bebas Neue',sans-serif; font-size:28px; color:var(--gold); letter-spacing:3px; margin-bottom:12px;">
        ${t('mc_intro_title')}
      </div>
      <div style="color:var(--muted); font-size:14px; max-width:500px; margin:0 auto 28px; line-height:1.7;">
        ${t('mc_intro_desc')}
      </div>
      <button id="btn-run-mc" class="btn-primary" style="font-size:16px; padding:14px 40px; letter-spacing:2px;">
        ${t('mc_btn_run')}
      </button>
    </div>`;

  document.getElementById('btn-run-mc')?.addEventListener('click', startMCSimulation);
}

function startMCSimulation() {
  const container = document.getElementById('mc-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      <div style="font-size:48px; margin-bottom:20px; animation:spin 1s linear infinite; display:inline-block;">⚙️</div>
      <div style="font-family:'Bebas Neue',sans-serif; font-size:22px; color:var(--gold); letter-spacing:2px; margin-bottom:24px;">
        ${t('mc_calculating')}
      </div>
      <div style="background:var(--surface2); border-radius:8px; height:12px; max-width:400px; margin:0 auto 12px; overflow:hidden; border:1px solid var(--border);">
        <div id="mc-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,var(--blue),var(--gold)); border-radius:8px; transition:width 0.2s;"></div>
      </div>
      <div id="mc-progress-text" style="color:var(--muted); font-size:13px;">0 / ${MC_SIMULATIONS.toLocaleString()} ${t('mc_simulations')}</div>
    </div>
    <style>
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    </style>`;

  runMonteCarlo(
    (pct) => {
      const bar  = document.getElementById('mc-progress-bar');
      const txt  = document.getElementById('mc-progress-text');
      if (bar) bar.style.width = (pct * 100).toFixed(1) + '%';
      if (txt) txt.textContent = `${Math.round(pct * MC_SIMULATIONS).toLocaleString()} / ${MC_SIMULATIONS.toLocaleString()} ${t('mc_simulations')}`;
    },
    (counts) => renderMCResults(counts)
  );
}

function renderMCResults(counts) {
  const container = document.getElementById('mc-container');
  if (!container) return;

  const N = MC_SIMULATIONS;

  // Ordenar por probabilidad de campeón
  const teams = Object.entries(counts)
    .map(([name, c]) => ({
      name,
      champion:  (c.champion  / N * 100),
      finalist:  (c.finalist  / N * 100),
      sf:        (c.sf        / N * 100),
      qf:        (c.qf        / N * 100),
    }))
    .sort((a, b) => b.champion - a.champion);

  const top16 = teams.slice(0, 16);
  const maxChamp = top16[0]?.champion || 1;

  // Medallas para el podio
  const medals = ['🥇', '🥈', '🥉'];

  // Podio top 3
  let podiumHtml = `<div style="display:flex; justify-content:center; align-items:flex-end; gap:16px; margin-bottom:32px; flex-wrap:wrap;">`;
  top16.slice(0, 3).forEach((t_team, i) => {
    const heights = [140, 110, 90];
    const colors  = ['var(--gold)', '#cbd5e1', '#b45309'];
    const h = heights[i];
    podiumHtml += `
      <div style="text-align:center; display:flex; flex-direction:column; align-items:center;">
        <div style="font-size:13px; font-weight:700; color:${colors[i]}; margin-bottom:4px;">${t_team.champion.toFixed(1)}%</div>
        <div style="font-size:11px; color:var(--muted); margin-bottom:8px;">${t('mc_champion_label')}</div>
        <div style="width:80px; height:${h}px; background:${colors[i]}; border-radius:6px 6px 0 0; opacity:0.85; display:flex; align-items:flex-start; justify-content:center; padding-top:10px;">
          <span style="font-size:28px;">${medals[i]}</span>
        </div>
        <div style="background:var(--surface2); border:1px solid var(--border); border-top:none; width:80px; padding:8px 4px; border-radius:0 0 6px 6px; font-size:11px; font-weight:700; color:var(--text);">
          ${t_team.name.length > 10 ? t_team.name.substring(0, 10) + '\u2026' : t_team.name}
        </div>
      </div>`;
  });
  podiumHtml += `</div>`;

  // Tabla completa top 16
  let tableHtml = `
    <table class="rank-table" style="font-size:12px;">
      <thead><tr>
        <th>#</th>
        <th>${t('mc_col_team')}</th>
        <th style="text-align:center;">${t('mc_col_champion')}</th>
        <th style="text-align:center;">${t('mc_col_finalist')}</th>
        <th style="text-align:center;">${t('mc_col_sf')}</th>
        <th style="text-align:center;">${t('mc_col_qf')}</th>
        <th style="text-align:left; min-width:100px;">${t('mc_col_bar')}</th>
      </tr></thead><tbody>`;

  top16.forEach((t, i) => {
    const barW = Math.round((t.champion / maxChamp) * 120);
    const rowBg = i < 3 ? `background:rgba(240,192,64,${0.06 - i * 0.015});` : '';
    const rankColor = i === 0 ? 'color:var(--gold);font-weight:700;' :
                      i === 1 ? 'color:#cbd5e1;font-weight:700;' :
                      i === 2 ? 'color:#b45309;font-weight:700;' : 'color:var(--muted);';
    tableHtml += `
      <tr style="${rowBg}">
        <td><span class="rank-num" style="${rankColor}">${i + 1}</span></td>
        <td style="font-weight:600;">${t.name}</td>
        <td style="text-align:center; color:var(--gold); font-weight:700;">${t.champion.toFixed(1)}%</td>
        <td style="text-align:center; color:var(--text);">${t.finalist.toFixed(1)}%</td>
        <td style="text-align:center; color:var(--muted);">${t.sf.toFixed(1)}%</td>
        <td style="text-align:center; color:var(--muted);">${t.qf.toFixed(1)}%</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="height:6px; width:${barW}px; background:linear-gradient(90deg,var(--blue),var(--gold)); border-radius:3px; flex-shrink:0;"></div>
          </div>
        </td>
      </tr>`;
  });
  tableHtml += `</tbody></table>`;

  container.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">
        ${t('mc_based_on')} <strong style="color:var(--gold);">${N.toLocaleString()} ${t('mc_simulations')}</strong> — ${t('mc_simulations_label')}
      </div>
      <div style="font-size:11px; color:var(--muted);">${t('mc_method_label')}</div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="card-title">${t('mc_podium_title')}</div>
      ${podiumHtml}
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">${t('mc_table_title')}</div>
      <div style="overflow-x:auto;">${tableHtml}</div>
    </div>

    <div style="text-align:center; margin-top:16px;">
      <button id="btn-rerun-mc" class="btn-primary" style="background:var(--surface2); border:1px solid var(--border); color:var(--muted); font-size:13px; padding:10px 28px;">
        ${t('mc_btn_rerun')}
      </button>
    </div>`;

  document.getElementById('btn-rerun-mc')?.addEventListener('click', startMCSimulation);
}

// ─── Inicialización ───────────────────────────────────────

function initMonteCarloModule() {
  renderMonteCarlo();
}
