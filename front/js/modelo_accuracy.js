// ══════════════════════════════════════════════════════════
// MODELO vs REALIDAD — ¿Acertó el modelo Poisson?
// Usa t() de i18n.js para todo texto visible al usuario.
// ══════════════════════════════════════════════════════════

let accuracyChart = null;

function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }
function poisson(k, lambda) { return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / fact(k); }

/**
 * Corrección de Dixon-Coles para marcadores bajos.
 * El modelo Poisson independiente subestima 0-0, 1-1 y
 * sobreestima 1-0 / 0-1. El parámetro ρ (rho) ≈ -0.13
 * es el valor empírico ajustado sobre datos de liga europea.
 *
 * τ(i, j, xgH, xgA, ρ) actúa como multiplicador sobre P(i,j).
 */
const DIXON_COLES_RHO = -0.13;

function dixonColesTau(i, j, xgH, xgA, rho) {
  if      (i === 0 && j === 0) return 1 - xgH * xgA * rho;
  else if (i === 0 && j === 1) return 1 + xgH * rho;
  else if (i === 1 && j === 0) return 1 + xgA * rho;
  else if (i === 1 && j === 1) return 1 - rho;
  return 1; // marcadores ≥ 2: sin corrección
}

/**
 * Predice el resultado de un partido usando Poisson + corrección Dixon-Coles.
 * @param {string}  homeTeam
 * @param {string}  awayTeam
 * @param {boolean} [knockout=false] — Si es eliminatoria, el empate se
 *   redistribuye proporcionalmente (nunca puede ser resultado final).
 */
function predictMatch(homeTeam, awayTeam, knockout = false) {
  const ratings   = window.ELO_RATINGS   || {};
  const globalAvg = window.ELO_GLOBAL_AVG || 1.3;
  const eloH  = ratings[homeTeam] || ELO_DEBUTANT;
  const eloA  = ratings[awayTeam] || ELO_DEBUTANT;
  const { xgA: xgH, xgB: xgAway } = eloToXG(eloH, eloA, globalAvg);

  let probH = 0, probA = 0, probD = 0;
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      // Probabilidad Poisson independiente ajustada por Dixon-Coles
      const tau = dixonColesTau(i, j, xgH, xgAway, DIXON_COLES_RHO);
      const p   = poisson(i, xgH) * poisson(j, xgAway) * tau;
      if      (i > j) probH += p;
      else if (i < j) probA += p;
      else             probD += p;
    }
  }

  // Normalizar (la corrección DC puede desplazar ligeramente la suma)
  const sum = probH + probA + probD;
  probH = (probH / sum) * 100;
  probA = (probA / sum) * 100;
  probD = (probD / sum) * 100;

  // ── Fase eliminatoria: el empate nunca es resultado final ──
  // Redistribuimos probD entre H y A proporcionalmente.
  if (knockout) {
    const total = probH + probA;
    probH += probD * (probH / Math.max(total, 0.001));
    probA += probD * (probA / Math.max(total, 0.001));
    probD = 0;
  }

  // ── Regla "zona de empate" (fase de grupos) ──────────────
  // Poisson puro casi nunca hace probD la más alta aunque el
  // partido sea equilibrado. Predecimos empate si:
  //   · probD supera el umbral mínimo (partido no demasiado
  //     desequilibrado en goles esperados)
  //   · la diferencia |probH − probA| es pequeña (ningún equipo
  //     domina claramente)
  // Calibrado sobre WC 2026 histórico: ~27% de empates en grupos.
  const DRAW_PROB_THRESHOLD = 24;   // probD mínima para considerar empate
  const DRAW_GAP_THRESHOLD  = 22;   // diferencia máxima H-A permitida

  let winner;
  if (!knockout && probD >= DRAW_PROB_THRESHOLD && Math.abs(probH - probA) < DRAW_GAP_THRESHOLD) {
    winner = 'draw';
  } else if (probH >= probA) {
    winner = 'home';
  } else {
    winner = 'away';
  }

  return {
    winner,
    probH: probH.toFixed(1),
    probD: probD.toFixed(1),
    probA: probA.toFixed(1),
    xgH:   xgH.toFixed(2),
    xgA:   xgAway.toFixed(2),
  };
}

function getRealWinner(match) {
  if (match.home_score > match.away_score) return 'home';
  if (match.home_score < match.away_score) return 'away';
  return 'draw';
}

function predLabel(pred, homeTeam, awayTeam) {
  if (pred === 'home') return homeTeam;
  if (pred === 'away') return awayTeam;
  return t('acc_draw');
}

function renderModeloAccuracy() {
  const container = document.getElementById('accuracy-container');
  if (!container) return;

  if (!RESULTADOS_2026 || !window.ELO_RATINGS) {
    container.innerHTML = `<div class="info-box" style="text-align:center; padding:30px;">⏳ ${t('acc_loading') || '...'}</div>`;
    return;
  }

  const played = RESULTADOS_2026.matches.filter(
    m => m.home_score !== null && m.away_score !== null
  );

  if (played.length === 0) {
    container.innerHTML = `<div class="info-box" style="text-align:center; padding:30px;">⚽</div>`;
    return;
  }

  let hits = 0;
  const matchResults = played.map(m => {
    const isKnockout = !m.group || m.group.trim() === "";
    const pred    = predictMatch(m.home, m.away, isKnockout);
    const realWin = getRealWinner(m);
    const isHit   = pred.winner === realWin;
    if (isHit) hits++;
    return { match: m, pred, realWin, isHit };
  });

  const accuracy = ((hits / played.length) * 100).toFixed(1);
  const misses   = played.length - hits;
  const acColor  = accuracy >= 50 ? 'var(--green)' : '#ef4444';
  const acBorder = accuracy >= 50 ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)';

  container.innerHTML = `
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="text-align:center; border:1px solid ${acBorder};">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:56px; color:${acColor}; line-height:1;">${accuracy}%</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; margin-top:6px;" data-i18n="acc_accuracy">${t('acc_accuracy')}</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:56px; color:var(--green); line-height:1;">${hits}</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; margin-top:6px;" data-i18n="acc_hits">${t('acc_hits')}</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:56px; color:#ef4444; line-height:1;">${misses}</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; margin-top:6px;" data-i18n="acc_misses">${t('acc_misses')}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-title" data-i18n="acc_chart_title">${t('acc_chart_title')}</div>
        <div class="chart-wrap-sm"><canvas id="chartAccuracy"></canvas></div>
      </div>
      <div class="card" style="display:flex; flex-direction:column; justify-content:center; gap:14px;">
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; font-weight:700;" data-i18n="acc_how_title">${t('acc_how_title')}</div>
        <div style="font-size:13px; line-height:1.7; color:var(--text);" data-i18n="acc_how_desc">${t('acc_how_desc')}</div>
        <div style="font-size:12px; color:var(--muted); border-left:2px solid var(--blue); padding-left:12px; line-height:1.6;" data-i18n="acc_how_note">${t('acc_how_note')}</div>
        <div style="font-size:11px; color:var(--muted);">
          📊 ${t('acc_based_on')} <strong>${played.length}</strong> ${t('acc_matches')} ·
          ${t('res_last_updated')}: <strong>${RESULTADOS_2026.last_updated}</strong>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" data-i18n="acc_detail_title">${t('acc_detail_title')}</div>
      <div style="overflow-x:auto;">
        <table class="rank-table" id="accuracyTable" style="font-size:12px;"></table>
      </div>
    </div>`;

  // Doughnut chart
  if (accuracyChart) accuracyChart.destroy();
  const ctx = document.getElementById('chartAccuracy');
  if (ctx) {
    accuracyChart = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: [t('acc_hits'), t('acc_misses')],
        datasets: [{
          data: [hits, misses],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0, hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: '#e8eef6', padding: 16, font: { size: 13 } } },
          tooltip: { callbacks: { label: c => ` ${c.raw} (${((c.raw / played.length) * 100).toFixed(1)}%)` } }
        }
      }
    });
  }

  // Tabla detallada
  const table = document.getElementById('accuracyTable');
  if (!table) return;

  table.innerHTML = `
    <thead><tr>
      <th>${t('acc_th_date')}</th>
      <th>${t('acc_th_group')}</th>
      <th style="text-align:right;">${t('acc_th_home')}</th>
      <th style="text-align:center;">${t('acc_th_result')}</th>
      <th>${t('acc_th_away')}</th>
      <th style="text-align:center;">${t('acc_th_pred')}</th>
      <th class="r">${t('acc_th_prob')}</th>
      <th style="text-align:center;">${t('acc_th_xg_home')}</th>
      <th style="text-align:center;">${t('acc_th_xg_away')}</th>
      <th style="text-align:center;">${t('acc_th_hit')}</th>
    </tr></thead><tbody>`;

  matchResults.forEach(({ match: m, pred, realWin, isHit }) => {
    const hitBadge = isHit
      ? `<span style="background:rgba(34,197,94,0.15); color:var(--green); border-radius:4px; padding:2px 8px; font-weight:700; font-size:11px;">${t('acc_yes')}</span>`
      : `<span style="background:rgba(239,68,68,0.15); color:#ef4444; border-radius:4px; padding:2px 8px; font-weight:700; font-size:11px;">${t('acc_no')}</span>`;

    const predWinnerLabel = predLabel(pred.winner, m.home, m.away);
    const predProb = pred.winner === 'home' ? pred.probH : (pred.winner === 'away' ? pred.probA : pred.probD);
    const predColor = isHit ? 'color:var(--green);' : 'color:#ef4444;';

    const homeStyle = realWin === 'home' ? 'font-weight:700; color:var(--green);' : (realWin === 'draw' ? 'color:var(--gold);' : 'color:var(--muted);');
    const awayStyle = realWin === 'away' ? 'font-weight:700; color:var(--green);' : (realWin === 'draw' ? 'color:var(--gold);' : 'color:var(--muted);');

    table.innerHTML += `
      <tr>
        <td style="color:var(--muted); font-size:11px;">${m.date}</td>
        <td><span style="background:var(--blue); color:#fff; border-radius:3px; padding:1px 5px; font-size:10px; font-weight:700;">${m.group}</span></td>
        <td style="text-align:right; ${homeStyle}">${m.home}</td>
        <td style="text-align:center;">
          <span style="background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:3px 10px; font-weight:700; font-family:'Bebas Neue',sans-serif; letter-spacing:2px; font-size:14px;">
            ${m.home_score} – ${m.away_score}
          </span>
        </td>
        <td style="${awayStyle}">${m.away}</td>
        <td style="text-align:center; font-size:12px; font-weight:600; ${predColor}">${predWinnerLabel}</td>
        <td class="r" style="color:var(--muted); font-size:11px;">${predProb}%</td>
        <td style="text-align:center; color:var(--gold); font-size:11px;">${pred.xgH}</td>
        <td style="text-align:center; color:var(--gold); font-size:11px;">${pred.xgA}</td>
        <td style="text-align:center;">${hitBadge}</td>
      </tr>`;
  });

  table.innerHTML += '</tbody>';
}
