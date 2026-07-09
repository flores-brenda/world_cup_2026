// ══════════════════════════════════════════════════════════
// PENALTIS — Penalty Shootout Stats Dashboard
// ══════════════════════════════════════════════════════════
// Uses window.SHOOTOUT_STATS (from elo.js) to render:
//   1. QF matchup comparisons (penalty head-to-head)
//   2. Full ranking table of all countries

const PENALTIS_QF_MATCHUPS = [
  { t1: "France", t2: "Morocco" },
  { t1: "Spain", t2: "Belgium" },
  { t1: "Norway", t2: "England" },
  { t1: "Argentina", t2: "Switzerland" }
];

/**
 * Returns a tier object { label, color, bg } based on shootout win rate.
 */
function penaltisTier(rate) {
  if (rate >= 0.70) return { labelKey: 'pen_tier_lethal',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: '🔥' };
  if (rate >= 0.50) return { labelKey: 'pen_tier_strong',   color: '#4a9eff', bg: 'rgba(74,158,255,0.10)',  icon: '💪' };
  if (rate >= 0.35) return { labelKey: 'pen_tier_average',  color: '#f0c040', bg: 'rgba(240,192,64,0.10)',  icon: '⚖️' };
  return                    { labelKey: 'pen_tier_weak',     color: '#f87171', bg: 'rgba(248,113,113,0.10)', icon: '⚠️' };
}

/**
 * Renders one QF duel card with penalty comparison.
 */
function renderDuelCard(m) {
  const stats = window.SHOOTOUT_STATS || {};
  const sA = stats[m.t1] || { played: 0, won: 0, rate: 0.5 };
  const sB = stats[m.t2] || { played: 0, won: 0, rate: 0.5 };

  const tierA = penaltisTier(sA.rate);
  const tierB = penaltisTier(sB.rate);

  // Who has the edge?
  const diff = sA.rate - sB.rate;
  const edgeTeam = diff > 0.01 ? m.t1 : diff < -0.01 ? m.t2 : null;
  const edgeAbs = Math.abs(diff * 100).toFixed(1);

  const pctA = (sA.rate * 100).toFixed(1);
  const pctB = (sB.rate * 100).toFixed(1);

  // Bar widths (max 100%)
  const barMaxRate = Math.max(sA.rate, sB.rate, 0.01);
  const barWA = Math.round((sA.rate / barMaxRate) * 100);
  const barWB = Math.round((sB.rate / barMaxRate) * 100);

  return `
    <div class="pen-duel-card">
      <div class="pen-duel-header">
        <div class="pen-duel-team pen-duel-team-left">
          <span class="pen-duel-name">${m.t1}</span>
          <span class="pen-duel-tier" style="color:${tierA.color}; background:${tierA.bg};">${tierA.icon} ${t(tierA.labelKey)}</span>
        </div>
        <div class="pen-duel-vs">VS</div>
        <div class="pen-duel-team pen-duel-team-right">
          <span class="pen-duel-name">${m.t2}</span>
          <span class="pen-duel-tier" style="color:${tierB.color}; background:${tierB.bg};">${tierB.icon} ${t(tierB.labelKey)}</span>
        </div>
      </div>

      <div class="pen-duel-stats">
        <div class="pen-duel-row">
          <div class="pen-duel-val pen-duel-val-left" style="color:${tierA.color};">${pctA}%</div>
          <div class="pen-duel-label">${t('pen_success_rate')}</div>
          <div class="pen-duel-val pen-duel-val-right" style="color:${tierB.color};">${pctB}%</div>
        </div>

        <div class="pen-duel-bars">
          <div class="pen-bar-track pen-bar-left">
            <div class="pen-bar-fill" style="width:${barWA}%; background:${tierA.color};"></div>
          </div>
          <div class="pen-bar-track pen-bar-right">
            <div class="pen-bar-fill pen-bar-fill-right" style="width:${barWB}%; background:${tierB.color};"></div>
          </div>
        </div>

        <div class="pen-duel-row">
          <div class="pen-duel-val pen-duel-val-left">${sA.won}/${sA.played}</div>
          <div class="pen-duel-label">${t('pen_won_played')}</div>
          <div class="pen-duel-val pen-duel-val-right">${sB.won}/${sB.played}</div>
        </div>

        <div class="pen-duel-row">
          <div class="pen-duel-val pen-duel-val-left">${sA.played}</div>
          <div class="pen-duel-label">${t('pen_experience')}</div>
          <div class="pen-duel-val pen-duel-val-right">${sB.played}</div>
        </div>
      </div>

      <div class="pen-duel-edge">
        ${edgeTeam
          ? `⚡ <strong>${edgeTeam}</strong> +${edgeAbs}%`
          : `⚖️ ${t('pen_even')}`
        }
      </div>
    </div>`;
}

/**
 * Returns HTML for the full ranking table.
 */
function renderPenaltisRanking() {
  const stats = window.SHOOTOUT_STATS || {};
  const teams = Object.entries(stats)
    .map(([name, s]) => ({
      name,
      played: s.played,
      won: s.won,
      rate: s.rate
    }))
    .sort((a, b) => b.rate - a.rate || b.won - a.won);

  const maxPlayed = Math.max(...teams.map(t => t.played), 1);
  const medals = ['🥇', '🥈', '🥉'];

  // QF team names for highlight
  const qfTeams = new Set(PENALTIS_QF_MATCHUPS.flatMap(m => [m.t1, m.t2]));

  let rows = '';
  teams.forEach((team, i) => {
    const tier = penaltisTier(team.rate);
    const pct = (team.rate * 100).toFixed(1);
    const barW = Math.round((team.rate / 1.0) * 140); // max bar at 100% rate
    const expBar = Math.round((team.played / maxPlayed) * 80);
    const isQF = qfTeams.has(team.name);
    const medal = i < 3 ? medals[i] : '';
    const rankColor = i === 0 ? 'color:var(--gold);font-weight:700;'
                    : i === 1 ? 'color:#cbd5e1;font-weight:700;'
                    : i === 2 ? 'color:#b45309;font-weight:700;'
                    : 'color:var(--muted);';

    rows += `
      <tr class="${isQF ? 'pen-row-qf' : ''}" style="${i < 3 ? `background:rgba(240,192,64,${0.06 - i * 0.015});` : ''}">
        <td><span class="rank-num" style="${rankColor}">${medal || (i + 1)}</span></td>
        <td style="font-weight:600;">
          ${team.name}
          ${isQF ? '<span class="pen-qf-badge">QF</span>' : ''}
        </td>
        <td style="text-align:center;">
          <span class="pen-tier-pill" style="color:${tier.color}; background:${tier.bg};">${tier.icon} ${t(tier.labelKey)}</span>
        </td>
        <td style="text-align:center; color:${tier.color}; font-weight:700;">${pct}%</td>
        <td style="text-align:center;">${team.won}/${team.played}</td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; gap:4px; justify-content:center;">
            <div style="width:${expBar}px; height:5px; background:var(--blue-light); border-radius:3px; opacity:0.6; flex-shrink:0;"></div>
            <span style="color:var(--muted); font-size:11px;">${team.played}</span>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="height:6px; width:${barW}px; background:linear-gradient(90deg, ${tier.color}88, ${tier.color}); border-radius:3px; flex-shrink:0;"></div>
          </div>
        </td>
      </tr>`;
  });

  return `
    <table class="rank-table pen-table" style="font-size:12px;">
      <thead><tr>
        <th>#</th>
        <th>${t('pen_col_team')}</th>
        <th style="text-align:center;">${t('pen_col_tier')}</th>
        <th style="text-align:center;">${t('pen_col_rate')}</th>
        <th style="text-align:center;">${t('pen_col_record')}</th>
        <th style="text-align:center;">${t('pen_col_exp')}</th>
        <th style="text-align:left; min-width:100px;">${t('pen_col_bar')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Legend for the tier categories.
 */
function renderTierLegend() {
  const tiers = [
    { rate: 0.75, labelKey: 'pen_tier_lethal',  desc: '> 70%' },
    { rate: 0.55, labelKey: 'pen_tier_strong',  desc: '50–70%' },
    { rate: 0.40, labelKey: 'pen_tier_average', desc: '35–50%' },
    { rate: 0.20, labelKey: 'pen_tier_weak',    desc: '< 35%' }
  ];
  return tiers.map(ti => {
    const tier = penaltisTier(ti.rate);
    return `<span class="pen-legend-item" style="color:${tier.color}; background:${tier.bg};">
      ${tier.icon} ${t(tier.labelKey)} <span style="opacity:0.6; font-size:10px;">(${ti.desc})</span>
    </span>`;
  }).join('');
}

/**
 * Main render for the full penaltis section.
 */
function renderPenaltisSection() {
  const container = document.getElementById('penaltis-container');
  if (!container) return;

  const stats = window.SHOOTOUT_STATS;
  if (!stats || Object.keys(stats).length === 0) {
    container.innerHTML = `<div class="info-box" style="text-align:center; padding:30px;">
      ⚠️ ${t('pen_no_data')}
    </div>`;
    return;
  }

  // Count some global stats
  const allTeams = Object.values(stats);
  const totalShootouts = allTeams.reduce((s, t) => s + t.played, 0) / 2; // each shootout involves 2 teams
  const avgRate = allTeams.reduce((s, t) => s + t.rate, 0) / allTeams.length;

  // Build duel cards
  const duelsHtml = PENALTIS_QF_MATCHUPS.map(m => renderDuelCard(m)).join('');

  container.innerHTML = `
    <!-- Global stats -->
    <div class="grid-3" style="margin-bottom:28px;">
      <div class="card hstat" style="text-align:center;">
        <div class="hstat-val" style="font-size:clamp(28px,5vw,40px); color:var(--gold);">${Object.keys(stats).length}</div>
        <div class="hstat-label" style="font-size:12px;">${t('pen_stat_countries')}</div>
      </div>
      <div class="card hstat" style="text-align:center;">
        <div class="hstat-val" style="font-size:clamp(28px,5vw,40px); color:var(--gold);">${Math.round(totalShootouts)}</div>
        <div class="hstat-label" style="font-size:12px;">${t('pen_stat_shootouts')}</div>
      </div>
      <div class="card hstat" style="text-align:center;">
        <div class="hstat-val" style="font-size:clamp(28px,5vw,40px); color:var(--gold);">${(avgRate * 100).toFixed(1)}%</div>
        <div class="hstat-label" style="font-size:12px;">${t('pen_stat_avg')}</div>
      </div>
    </div>

    <!-- QF Duel Comparisons -->
    <div class="card" style="margin-bottom:28px;">
      <div class="card-title">${t('pen_qf_title')}</div>
      <div class="pen-duels-grid">
        ${duelsHtml}
      </div>
    </div>

    <!-- Tier Legend -->
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; justify-content:center;">
      ${renderTierLegend()}
    </div>

    <!-- Full Ranking Table -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">${t('pen_ranking_title')}</div>
      <div style="overflow-x:auto;">
        ${renderPenaltisRanking()}
      </div>
    </div>

    <!-- Method note -->
    <div class="info-box" style="text-align:center; margin-top:16px;">
      📊 ${t('pen_method_note')}
    </div>
  `;
}

function initPenaltisModule() {
  renderPenaltisSection();
}
