// ══════════════════════════════════════════════════════════
// RESULTADOS EN VIVO — Tabla de posiciones por grupo
// Lee data/resultados_2026.json y calcula standings reales
// ══════════════════════════════════════════════════════════

let RESULTADOS_2026 = null;

// ── Mapa de códigos de banderas (flagcdn.com) ──────────────
const FLAG_CODES = {
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czechia": "cz",
  "Canada": "ca", "Bosnia and Herzegovina": "ba", "Qatar": "qa", "Switzerland": "ch",
  "Brazil": "br", "Morocco": "ma", "Scotland": "gb-sct", "Haiti": "ht",
  "United States": "us", "Paraguay": "py", "Australia": "au", "Turkey": "tr",
  "Germany": "de", "Curacao": "cw", "Ivory Coast": "ci", "Ecuador": "ec",
  "Netherlands": "nl", "Japan": "jp", "Sweden": "se", "Tunisia": "tn",
  "Belgium": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
  "Spain": "es", "Cape Verde": "cv", "Saudi Arabia": "sa", "Uruguay": "uy",
  "France": "fr", "Senegal": "sn", "Iraq": "iq", "Norway": "no",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordan": "jo",
  "Portugal": "pt", "DR Congo": "cd", "Uzbekistan": "uz", "Colombia": "co",
  "England": "gb-eng", "Croatia": "hr", "Ghana": "gh", "Panama": "pa"
};

function flagImg(team, size = 48) {
  const code = FLAG_CODES[team] || 'un';
  return `<img src="https://flagcdn.com/w80/${code}.png" width="${size}"
    style="border-radius:4px; border:1px solid rgba(255,255,255,0.12); display:block; margin:0 auto;"
    alt="${team}" onerror="this.style.display='none'">`;
}

// ── Renderiza los últimos 3 resultados en la Home ──────────
function renderHomeResults() {
  const container = document.getElementById('home-matches');
  if (!container || !RESULTADOS_2026) return;

  const played = RESULTADOS_2026.matches
    .filter(m => m.home_score !== null && m.away_score !== null)
    .slice(-3)
    .reverse(); // más reciente primero

  if (played.length === 0) {
    container.innerHTML = `<div class="info-box" style="grid-column:1/-1; text-align:center; padding:20px; color:var(--muted);">
      ⏳ ${t('acc_loading') || 'Cargando resultados...'}
    </div>`;
    return;
  }

  container.innerHTML = played.map(m => {
    const winner   = m.home_score > m.away_score ? 'home' : (m.home_score < m.away_score ? 'away' : 'draw');
    const isDraw   = winner === 'draw';
    const homeWins = winner === 'home';
    const awayWins = winner === 'away';

    const scoreColor = isDraw ? 'var(--gold)' : 'var(--green)';
    const homeColor  = homeWins ? 'var(--green)' : (isDraw ? 'var(--gold)' : 'var(--muted)');
    const awayColor  = awayWins ? 'var(--green)' : (isDraw ? 'var(--gold)' : 'var(--muted)');

    const resultLabel = isDraw
      ? t('acc_draw')
      : (homeWins ? `${m.home} ✓` : `${m.away} ✓`);

    const groupBadge = `<span style="background:var(--blue); color:#fff; border-radius:3px; padding:1px 6px;
      font-size:9px; font-weight:700; letter-spacing:1px; margin-right:6px;">GR. ${m.group}</span>`;

    return `
      <div class="card" style="text-align:center; padding:20px; position:relative; transition:transform .2s;"
           onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">

        <!-- Cabecera: grupo + fecha + ciudad -->
        <div style="font-size:10px; color:var(--gold); letter-spacing:1px; margin-bottom:14px; font-weight:700;">
          ${groupBadge}${m.date} · ${m.city.toUpperCase()}
        </div>

        <!-- Equipos y marcador -->
        <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
          <!-- Local -->
          <div style="flex:1; text-align:center;">
            ${flagImg(m.home, 44)}
            <div style="font-size:11px; font-weight:700; margin-top:8px; color:${homeColor};
              text-transform:uppercase; letter-spacing:.5px; line-height:1.2;">${m.home}</div>
          </div>

          <!-- Marcador -->
          <div style="text-align:center; min-width:80px;">
            <div style="font-family:'Bebas Neue',sans-serif; font-size:46px; color:${scoreColor};
              line-height:1; letter-spacing:3px;">${m.home_score}–${m.away_score}</div>
            <div style="font-size:9px; color:var(--muted); margin-top:4px; text-transform:uppercase;
              letter-spacing:1px;">${resultLabel}</div>
          </div>

          <!-- Visitante -->
          <div style="flex:1; text-align:center;">
            ${flagImg(m.away, 44)}
            <div style="font-size:11px; font-weight:700; margin-top:8px; color:${awayColor};
              text-transform:uppercase; letter-spacing:.5px; line-height:1.2;">${m.away}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}


/**
 * Carga el JSON de resultados reales y renderiza la sección.
 * También activa un auto-refresh cada 5 minutos.
 */
async function initResultados() {
  await cargarResultados(); // carga inicial

  // ── Auto-refresh cada 5 minutos ──────────────────────────
  const INTERVALO_MS = 5 * 60 * 1000; // 5 minutos
  setInterval(async () => {
    const prevUpdated = RESULTADOS_2026?.last_updated;
    await cargarResultados(true); // silent = true
    const newUpdated  = RESULTADOS_2026?.last_updated;
    // Solo re-renderiza si hay cambios o siempre (por si acaso los scores cambiaron)
    rerenderLiveSections();
    console.info(`🔄 Auto-refresh resultados (${new Date().toLocaleTimeString()})`);
  }, INTERVALO_MS);
}

/** Carga (o recarga) el JSON. Si silent=true no muestra el spinner. */
async function cargarResultados(silent = false) {
  const container = document.getElementById('resultados-container');
  try {
    // Cache-bust para evitar que el navegador devuelva el JSON cacheado
    const url = `./data/resultados_2026.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    RESULTADOS_2026 = await res.json();
    if (!silent) renderResultados();
  } catch (e) {
    console.warn('⚠️ resultados_2026.json no disponible:', e.message);
    if (!silent && container) {
      container.innerHTML = `<div class="info-box" style="color:var(--muted); text-align:center; padding:30px;">
        ⚠️ No se encontró el archivo de resultados.<br>
        <code style="font-size:11px;">data/resultados_2026.json</code>
      </div>`;
    }
  }
}

/** Re-renderiza todas las secciones que dependen de resultados en vivo. */
function rerenderLiveSections() {
  renderResultados();
  if (typeof renderHomeResults    === 'function') renderHomeResults();
  if (typeof renderModeloAccuracy === 'function') renderModeloAccuracy();
  // Re-aplica i18n al contenido nuevo
  if (typeof setLanguage === 'function' && typeof currentLang !== 'undefined') {
    setLanguage(currentLang);
  }
}

/**
 * Calcula los standings de un grupo a partir de los partidos jugados.
 */
function calcularStandings(groupId, matchesPlayed) {
  const teams = GROUPES[groupId] || [];
  const standings = {};

  teams.forEach(t => {
    standings[t] = { equipe: t, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  });

  matchesPlayed.forEach(m => {
    if (m.home_score === null || m.away_score === null) return; // partido no jugado aún
    const home = m.home;
    const away = m.away;
    const gh = m.home_score;
    const ga = m.away_score;

    if (!standings[home]) standings[home] = { equipe: home, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    if (!standings[away]) standings[away] = { equipe: away, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, dg: 0, pts: 0 };

    standings[home].pj++; standings[away].pj++;
    standings[home].gf += gh; standings[home].gc += ga;
    standings[away].gf += ga; standings[away].gc += gh;
    standings[home].dg = standings[home].gf - standings[home].gc;
    standings[away].dg = standings[away].gf - standings[away].gc;

    if (gh > ga) {
      standings[home].pts += 3; standings[home].v++;
      standings[away].d++;
    } else if (gh < ga) {
      standings[away].pts += 3; standings[away].v++;
      standings[home].d++;
    } else {
      standings[home].pts += 1; standings[home].e++;
      standings[away].pts += 1; standings[away].e++;
    }
  });

  return Object.values(standings).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf
  );
}

/**
 * Genera el HTML de una tarjeta de grupo con su tabla de posiciones.
 */
function buildGroupCard(groupId) {
  const allMatches = RESULTADOS_2026.matches.filter(m => m.group === groupId);
  const played     = allMatches.filter(m => m.home_score !== null);
  const upcoming   = allMatches.filter(m => m.home_score === null);
  const standings  = calcularStandings(groupId, played);
  const totalTeamMatches = (GROUPES[groupId] || []).length - 1; // partidos que jugará cada equipo (round-robin)

  // Encabezado del grupo
  let html = `
    <div class="groupe-card" id="live-group-${groupId}">
      <div class="groupe-header" style="display:flex; align-items:center; gap:10px;">
        <div class="groupe-letter">G${groupId}</div>
        <div>
          <div style="font-size:11px; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:1px;">${t('res_group')} ${groupId}</div>
          <div style="font-size:10px; color:rgba(255,255,255,0.5);">${played.length} ${played.length !== 1 ? t('res_matches_played_pl') : t('res_match_played_sg')}</div>
        </div>
        <div style="margin-left:auto;">
          <span style="font-size:10px; background:rgba(240,192,64,0.2); color:var(--gold); border-radius:4px; padding:2px 8px; font-weight:700; letter-spacing:1px;">${t('res_in_progress')}</span>
        </div>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 4px 5px 10px; text-align:left; color:var(--muted); font-size:10px; width:18px;">#</th>
            <th style="padding:5px 4px; text-align:left; color:var(--muted); font-size:10px;">${t('res_col_team')}</th>
            <th style="padding:5px 4px; text-align:center; color:var(--muted); font-size:10px; width:24px;">${t('res_col_pj')}</th>
            <th style="padding:5px 4px; text-align:center; color:var(--muted); font-size:10px; width:22px;">${t('res_col_v')}</th>
            <th style="padding:5px 4px; text-align:center; color:var(--muted); font-size:10px; width:22px;">${t('res_col_e')}</th>
            <th style="padding:5px 4px; text-align:center; color:var(--muted); font-size:10px; width:22px;">${t('res_col_d')}</th>
            <th style="padding:5px 4px; text-align:center; color:var(--muted); font-size:10px; width:28px;">${t('res_col_dg')}</th>
            <th style="padding:5px 10px 5px 4px; text-align:center; color:var(--gold); font-size:10px; font-weight:700; width:26px;">${t('res_col_pts')}</th>
          </tr>
        </thead>
        <tbody>`;

  standings.forEach((s, idx) => {
    const isQualified = idx < 2;
    const isFighting  = idx === 2;
    const rowBg       = isQualified ? 'background:rgba(74,222,128,0.07);' : (isFighting ? 'background:rgba(240,192,64,0.04);' : '');
    const rankColor   = isQualified ? 'color:var(--green); font-weight:700;' : (isFighting ? 'color:var(--gold);' : 'color:var(--muted);');
    const dgColor     = s.dg > 0 ? '#22c55e' : (s.dg < 0 ? '#ef4444' : '#7a90a8');
    const dgVal       = s.dg > 0 ? `+${s.dg}` : s.dg;
    // Strip long country names so they don't break layout
    const shortName   = s.equipe.length > 12 ? s.equipe.substring(0, 11) + '…' : s.equipe;
    const qualDot     = isQualified
      ? `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);margin-right:3px;vertical-align:middle;"></span>`
      : '';

    html += `
      <tr style="${rowBg} border-bottom:1px solid rgba(255,255,255,0.03);">
        <td style="padding:6px 4px 6px 10px;"><span style="${rankColor} font-size:11px;">${idx + 1}</span></td>
        <td style="padding:6px 4px; font-weight:600; font-size:11px; white-space:nowrap;">${qualDot}${shortName}</td>
        <td style="padding:6px 4px; text-align:center; color:var(--muted);">${s.pj > 0 ? s.pj : '–'}</td>
        <td style="padding:6px 4px; text-align:center;">${s.pj > 0 ? s.v : '–'}</td>
        <td style="padding:6px 4px; text-align:center;">${s.pj > 0 ? s.e : '–'}</td>
        <td style="padding:6px 4px; text-align:center;">${s.pj > 0 ? s.d : '–'}</td>
        <td style="padding:6px 4px; text-align:center; color:${dgColor}; font-weight:600;">${s.pj > 0 ? dgVal : '–'}</td>
        <td style="padding:6px 10px 6px 4px; text-align:center; font-weight:700; color:var(--gold); font-size:13px;">${s.pts}</td>
      </tr>`;
  });

  html += `</tbody></table>`;

  // Últimos resultados del grupo
  if (played.length > 0) {
    html += `<div style="padding: 10px 14px; border-top: 1px solid var(--border);">
      <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; font-weight:700;">${t('res_results_label')}</div>`;
    played.slice(-3).forEach(m => {
      const winner = m.home_score > m.away_score ? 'home' : (m.home_score < m.away_score ? 'away' : 'draw');
      const homeW  = winner === 'home' ? 'font-weight:700; color:var(--green);' : (winner === 'draw' ? 'color:var(--gold);' : 'color:var(--muted);');
      const awayW  = winner === 'away' ? 'font-weight:700; color:var(--green);' : (winner === 'draw' ? 'color:var(--gold);' : 'color:var(--muted);');
      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:5px 0; font-size:12px;">
          <span style="${homeW}; flex:1; text-align:right; padding-right:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.home}</span>
          <span style="background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:3px 10px; font-weight:700; font-size:13px; font-family:'Bebas Neue',sans-serif; letter-spacing:2px; min-width:52px; text-align:center;">
            ${m.home_score} – ${m.away_score}
          </span>
          <span style="${awayW}; flex:1; padding-left:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.away}</span>
        </div>`;
    });
    html += `</div>`;
  }

  // Próximos partidos del grupo
  if (upcoming.length > 0) {
    html += `<div style="padding: 8px 14px 12px; border-top: 1px solid var(--border);">
      <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; font-weight:700;">${t('res_upcoming_label')}</div>`;
    upcoming.slice(0, 2).forEach(m => {
      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; font-size:11px; color:var(--muted);">
          <span style="flex:1; text-align:right; padding-right:8px;">${m.home}</span>
          <span style="font-size:9px; background:var(--surface2); border-radius:3px; padding:2px 6px; color:var(--muted);">${m.date}</span>
          <span style="flex:1; padding-left:8px;">${m.away}</span>
        </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`; // cierra groupe-card
  return html;
}

/**
 * Renderiza el contenido completo de la sección de resultados en vivo.
 */
function renderResultados() {
  const container = document.getElementById('resultados-container');
  if (!container || !RESULTADOS_2026) return;

  // Agrupar por grupo
  const groupsWithData = [...new Set(RESULTADOS_2026.matches.map(m => m.group))].sort();

  // Estadísticas rápidas del torneo
  const played   = RESULTADOS_2026.matches.filter(m => m.home_score !== null);
  const totalGols = played.reduce((sum, m) => sum + m.home_score + m.away_score, 0);
  const avgGols   = played.length > 0 ? (totalGols / played.length).toFixed(2) : '–';

  // Banner de estadísticas
  container.innerHTML = `
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card" style="text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:48px; color:var(--gold); line-height:1;">${played.length}</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px;" data-i18n="res_matches_played">Partidos Jugados</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:48px; color:var(--gold); line-height:1;">${totalGols}</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px;" data-i18n="res_total_goals">Goles del Torneo</div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-family:'Bebas Neue',sans-serif; font-size:48px; color:var(--gold); line-height:1;">${avgGols}</div>
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px;" data-i18n="res_avg_goals">Promedio Goles/Partido</div>
      </div>
    </div>
    <div style="font-size:11px; color:var(--muted); margin-bottom:20px; padding:8px 12px; background:var(--surface2); border-radius:6px; border-left:3px solid var(--gold);">
      📅 ${t('res_last_updated')}: <strong>${RESULTADOS_2026.last_updated}</strong> · 
      <span style="color:var(--green);">■</span> ${t('res_legend_qualified')} &nbsp;
      <span style="color:var(--gold);">■</span> ${t('res_legend_fighting')}
    </div>
    <div class="groupes-grid" id="live-standings-grid"></div>`;

  const grid = document.getElementById('live-standings-grid');
  if (!grid) return;

  groupsWithData.forEach(groupId => {
    const div = document.createElement('div');
    div.innerHTML = buildGroupCard(groupId);
    grid.appendChild(div.firstElementChild);
  });
}
