// ══════════════════════════════════════════════════════════
// MONTE CARLO CUARTOS — Simulation starting from Quarter-finals (8)
// ══════════════════════════════════════════════════════════

const MC_QF_SIMULATIONS = 10000;
const MC_QF_BATCH_SIZE = 500;

// QF matchups — actual quarterfinal pairings
const QF_MATCHUPS_MC = [
  { t1: "France", t2: "Morocco" },
  { t1: "Spain", t2: "Belgium" },
  { t1: "Norway", t2: "England" },
  { t1: "Argentina", t2: "Switzerland" }
];

function mcSimulateKOMatchQF(teamA, teamB, ratings, globalAvg) {
  const eloA = ratings[teamA] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
  const eloB = ratings[teamB] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
  if (typeof eloToXG === 'function' && typeof simDixonColesGoals === 'function') {
    const { xgA, xgB } = eloToXG(eloA, eloB, globalAvg);
    const [gA, gB] = simDixonColesGoals(xgA, xgB);
    if (gA !== gB) return gA > gB ? teamA : teamB;
  } else {
    const probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    if (Math.random() < probA) return teamA;
    return teamB;
  }
  // Penaltis
  const probPenA = 0.5 + 0.1 * ((eloA - eloB) / Math.max(eloA, eloB));
  return Math.random() < Math.max(0.3, Math.min(0.7, probPenA)) ? teamA : teamB;
}

function mcRunOneTournamentQF(ratings, globalAvg) {
  // Build QF matches directly from known matchups
  let currentRound = QF_MATCHUPS_MC.map(m => ({ t1: m.t1, t2: m.t2 }));

  const sfTeams = [];
  const qfTeams = currentRound.map(m => m.t1).concat(currentRound.map(m => m.t2));
  let finalist1, finalist2, champion;

  const rounds = ['qf', 'sf', 'final'];
  for (const round of rounds) {
    const nextRound = [];
    for (const match of currentRound) {
      if (!match.t1 || !match.t2 || match.t1 === 'TBD' || match.t2 === 'TBD') {
        nextRound.push(match.t1 || match.t2 || 'TBD');
        continue;
      }
      // Check real result first
      let realW = null;
      if (typeof getRealPlayedMatchWinnerMC === 'function') {
        realW = getRealPlayedMatchWinnerMC(match.t1, match.t2);
      } else if (typeof getRealWinnerQF === 'function') {
        realW = getRealWinnerQF(match.t1, match.t2);
      }
      const winner = realW ? realW : mcSimulateKOMatchQF(match.t1, match.t2, ratings, globalAvg);
      nextRound.push(winner);

      if (round === 'sf') { sfTeams.push(match.t1, match.t2); }
      if (round === 'final') {
        finalist1 = match.t1; finalist2 = match.t2;
        champion = winner;
      }
    }
    if (round !== 'final') {
      currentRound = [];
      for (let i = 0; i < nextRound.length; i += 2) {
        currentRound.push({ t1: nextRound[i], t2: nextRound[i + 1] || 'TBD' });
      }
    }
  }
  return { champion, finalist1, finalist2, sfTeams, qfTeams };
}

function runMonteCarloQF(onProgress, onComplete) {
  const ratings = window.ELO_RATINGS || {};
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;
  const counts = {};
  const initTeam = t => { if (!counts[t]) counts[t] = { champion: 0, finalist: 0, sf: 0, qf: 0 }; };
  let done = 0;

  function runBatch() {
    const end = Math.min(done + MC_QF_BATCH_SIZE, MC_QF_SIMULATIONS);
    for (let s = done; s < end; s++) {
      const { champion, finalist1, finalist2, sfTeams, qfTeams } = mcRunOneTournamentQF(ratings, globalAvg);
      if (champion) { initTeam(champion); counts[champion].champion++; }
      [finalist1, finalist2].forEach(t => { if (t) { initTeam(t); counts[t].finalist++; } });
      sfTeams.forEach(t => { initTeam(t); counts[t].sf++; });
      qfTeams.forEach(t => { initTeam(t); counts[t].qf++; });
    }
    done = end;
    onProgress(done / MC_QF_SIMULATIONS);
    if (done < MC_QF_SIMULATIONS) setTimeout(runBatch, 0);
    else onComplete(counts);
  }
  runBatch();
}

function renderMonteCarloQF() {
  const container = document.getElementById('mc-container-qf');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center; padding: 40px 20px;">
      <div style="font-size:64px; margin-bottom:16px;">🎲</div>
      <div style="font-family:'Bebas Neue',sans-serif; font-size:28px; color:var(--gold); letter-spacing:3px; margin-bottom:12px;">
        ${t('mc_intro_title')} (CUARTOS)
      </div>
      <div style="color:var(--muted); font-size:14px; max-width:500px; margin:0 auto 28px; line-height:1.7;">
        ${t('sec_mc_qf_sub')}
      </div>
      <button id="btn-run-mc-qf" class="btn-primary" style="font-size:16px; padding:14px 40px; letter-spacing:2px;">
        ${t('mc_btn_run')}
      </button>
    </div>`;
  document.getElementById('btn-run-mc-qf')?.addEventListener('click', startMCSimulationQF);
}

function startMCSimulationQF() {
  const container = document.getElementById('mc-container-qf');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      <div style="font-size:48px; margin-bottom:20px; animation:spin 1s linear infinite; display:inline-block;">⚙️</div>
      <div style="font-family:'Bebas Neue',sans-serif; font-size:22px; color:var(--gold); letter-spacing:2px; margin-bottom:24px;">
        ${t('mc_calculating')}
      </div>
      <div style="background:var(--surface2); border-radius:8px; height:12px; max-width:400px; margin:0 auto 12px; overflow:hidden; border:1px solid var(--border);">
        <div id="mc-progress-bar-qf" style="height:100%; width:0%; background:linear-gradient(90deg,var(--blue),var(--gold)); border-radius:8px; transition:width 0.2s;"></div>
      </div>
      <div id="mc-progress-text-qf" style="color:var(--muted); font-size:13px;">0 / ${MC_QF_SIMULATIONS.toLocaleString()} ${t('mc_simulations')}</div>
    </div>
    <style>@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }</style>`;

  runMonteCarloQF(
    (pct) => {
      const bar = document.getElementById('mc-progress-bar-qf');
      const txt = document.getElementById('mc-progress-text-qf');
      if (bar) bar.style.width = (pct * 100).toFixed(1) + '%';
      if (txt) txt.textContent = `${Math.round(pct * MC_QF_SIMULATIONS).toLocaleString()} / ${MC_QF_SIMULATIONS.toLocaleString()} ${t('mc_simulations')}`;
    },
    (counts) => renderMCResultsQF(counts)
  );
}

function renderMCResultsQF(counts) {
  const container = document.getElementById('mc-container-qf');
  if (!container) return;
  const N = MC_QF_SIMULATIONS;
  const teams = Object.entries(counts)
    .map(([name, c]) => ({
      name,
      champion: (c.champion / N * 100),
      finalist: (c.finalist / N * 100),
      sf: (c.sf / N * 100),
      qf: (c.qf / N * 100),
    }))
    .sort((a, b) => b.champion - a.champion);

  const top16 = teams.slice(0, 16);
  const maxChamp = top16[0]?.champion || 1;
  const medals = ['🥇', '🥈', '🥉'];

  let podiumHtml = `<div style="display:flex; justify-content:center; align-items:flex-end; gap:16px; margin-bottom:32px; flex-wrap:wrap;">`;
  top16.slice(0, 3).forEach((t_team, i) => {
    const heights = [140, 110, 90];
    const colors = ['var(--gold)', '#cbd5e1', '#b45309'];
    podiumHtml += `
      <div style="text-align:center; display:flex; flex-direction:column; align-items:center;">
        <div style="font-size:13px; font-weight:700; color:${colors[i]}; margin-bottom:4px;">${t_team.champion.toFixed(1)}%</div>
        <div style="font-size:11px; color:var(--muted); margin-bottom:8px;">${t('mc_champion_label')}</div>
        <div style="width:80px; height:${heights[i]}px; background:${colors[i]}; border-radius:6px 6px 0 0; opacity:0.85; display:flex; align-items:flex-start; justify-content:center; padding-top:10px;">
          <span style="font-size:28px;">${medals[i]}</span>
        </div>
        <div style="background:var(--surface2); border:1px solid var(--border); border-top:none; width:80px; padding:8px 4px; border-radius:0 0 6px 6px; font-size:11px; font-weight:700; color:var(--text);">
          ${t_team.name.length > 10 ? t_team.name.substring(0, 10) + '\u2026' : t_team.name}
        </div>
      </div>`;
  });
  podiumHtml += `</div>`;

  let tableHtml = `
    <table class="rank-table" style="font-size:12px;">
      <thead><tr>
        <th>#</th><th>${t('mc_col_team')}</th>
        <th style="text-align:center;">${t('mc_col_champion')}</th>
        <th style="text-align:center;">${t('mc_col_finalist')}</th>
        <th style="text-align:center;">${t('mc_col_sf')}</th>
        <th style="text-align:left; min-width:100px;">${t('mc_col_bar')}</th>
      </tr></thead><tbody>`;

  top16.forEach((t_team, i) => {
    const barW = Math.round((t_team.champion / maxChamp) * 120);
    const rowBg = i < 3 ? `background:rgba(240,192,64,${0.06 - i * 0.015});` : '';
    const rankColor = i === 0 ? 'color:var(--gold);font-weight:700;' :
                      i === 1 ? 'color:#cbd5e1;font-weight:700;' :
                      i === 2 ? 'color:#b45309;font-weight:700;' : 'color:var(--muted);';
    tableHtml += `
      <tr style="${rowBg}">
        <td><span class="rank-num" style="${rankColor}">${i + 1}</span></td>
        <td style="font-weight:600;">${t_team.name}</td>
        <td style="text-align:center; color:var(--gold); font-weight:700;">${t_team.champion.toFixed(1)}%</td>
        <td style="text-align:center; color:var(--text);">${t_team.finalist.toFixed(1)}%</td>
        <td style="text-align:center; color:var(--muted);">${t_team.sf.toFixed(1)}%</td>
        <td><div style="display:flex; align-items:center; gap:8px;"><div style="height:6px; width:${barW}px; background:linear-gradient(90deg,var(--blue),var(--gold)); border-radius:3px; flex-shrink:0;"></div></div></td>
      </tr>`;
  });
  tableHtml += `</tbody></table>`;

  container.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">
        ${t('mc_based_on')} <strong style="color:var(--gold);">${N.toLocaleString()} ${t('mc_simulations')}</strong> — ${t('mc_simulations_label')} (Desde Cuartos)
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
      <button id="btn-rerun-mc-qf" class="btn-primary" style="background:var(--surface2); border:1px solid var(--border); color:var(--muted); font-size:13px; padding:10px 28px;">
        ${t('mc_btn_rerun')}
      </button>
    </div>`;
  document.getElementById('btn-rerun-mc-qf')?.addEventListener('click', startMCSimulationQF);
}

function initMonteCarloQFModule() {
  renderMonteCarloQF();
}
