# ══════════════════════════════════════════════════════════
# EXPORTACIÓN — Dashboard HTML interactivo
# Genera wc2026_dashboard.html en la carpeta outputs/
# ══════════════════════════════════════════════════════════

import json
import os
import pandas as pd
from utils.groups import groupes_2026

os.makedirs("outputs", exist_ok=True)

# On charge le classement historique calculé dans performance.py
try:
    stats_wc = pd.read_csv("data_clean/classement_historique_wc.csv")
except FileNotFoundError:
    print("Erreur : classement_historique_wc.csv introuvable. Exécutez performance.py d'abord.")
    raise

# ── Preparar datos desde tus DataFrames ya calculados ────
stats_export = []
for _, row in stats_wc.iterrows():
    stats_export.append({
        "equipe":      row["equipe"],
        "PJ":          int(row["PJ"]),
        "V":           int(row["V"]),
        "N":           int(row["N"]),
        "D":           int(row["D"]),
        "BF":          int(row["BF"]),
        "BC":          int(row["BC"]),
        "DB":          int(row["DB"]),
        "PTS":         int(row["PTS"]),
        "taux_V":      float(row["taux_V"]),
        "titres":      int(row["titres"]),
        "finales":     int(row["finales"]),
        "annees":      str(row["annees_titres"]),
        "groupe":      str(row["groupe"]),
    })

groupes_export = groupes_2026  # ya lo tienes definido en tu notebook

# On charge les prédictions
try:
    df_strengths = pd.read_csv("data_clean/team_strengths.csv")
    df_global = pd.read_csv("data_clean/global_stats.csv")
    predictions_export = {
        "strengths": df_strengths.to_dict(orient="records"),
        "global_avg": float(df_global.iloc[0]["global_avg_goals"])
    }
except FileNotFoundError:
    print("Erreur : team_strengths.csv introuvable. Exécutez predictions.py d'abord.")
    raise

# On charge l'historique complet pour les face-à-face (H2H)
try:
    df_results = pd.read_csv("data_clean/results_clean.csv")
    df_h2h = df_results[
        df_results["home_team"].isin(groupes_2026) & 
        df_results["away_team"].isin(groupes_2026)
    ].copy()
    
    # Ne garder que les colonnes nécessaires pour minimiser la taille
    df_h2h = df_h2h[["date", "home_team", "away_team", "home_score", "away_score", "tournament"]]
    
    # Remplacer les valeurs nulles par des entiers ou chaînes vides pour le JSON
    df_h2h = df_h2h.fillna({"home_score": -1, "away_score": -1, "tournament": "Unknown"})
    df_h2h["date"] = df_h2h["date"].astype(str)
    
    h2h_export = df_h2h.to_dict(orient="records")
except FileNotFoundError:
    print("Erreur : results_clean.csv introuvable. Exécutez clean.py d'abord.")
    h2h_export = []

# Convertir a JSON para inyectar en el HTML
stats_json   = json.dumps(stats_export,   ensure_ascii=False)
groupes_json = json.dumps(groupes_export, ensure_ascii=False)
predictions_json = json.dumps(predictions_export, ensure_ascii=False)
h2h_json = json.dumps(h2h_export, ensure_ascii=False)

# ── Template HTML ─────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>⚽ Analyse FIFA World Cup 2026</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg:#060d18;--surface:#0d1b2e;--surface2:#132238;
    --gold:#f0c040;--blue:#185fa5;--blue-light:#4a9eff;
    --green:#22c55e;--red:#ef4444;--text:#e8eef6;--muted:#7a90a8;
    --border:rgba(255,255,255,0.07);--radius:12px;
  }}
  *{{box-sizing:border-box;margin:0;padding:0;}}
  body{{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden;}}
  header{{position:relative;padding:60px 40px 50px;text-align:center;overflow:hidden;}}
  header::before{{content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(240,192,64,.18) 0%,transparent 70%),
               radial-gradient(ellipse 50% 40% at 20% 100%,rgba(24,95,165,.25) 0%,transparent 60%),
               radial-gradient(ellipse 50% 40% at 80% 100%,rgba(24,95,165,.2) 0%,transparent 60%);
    pointer-events:none;}}
  .header-badge{{display:inline-block;background:var(--gold);color:#060d18;font-family:'Bebas Neue',sans-serif;
    font-size:13px;letter-spacing:3px;padding:4px 16px;border-radius:4px;margin-bottom:18px;}}
  header h1{{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,8vw,96px);letter-spacing:4px;line-height:.9;
    background:linear-gradient(135deg,#fff 30%,var(--gold) 70%);-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;background-clip:text;margin-bottom:14px;}}
  header p{{color:var(--muted);font-size:15px;font-weight:300;letter-spacing:1px;}}
  .header-stats{{display:flex;justify-content:center;gap:40px;margin-top:36px;flex-wrap:wrap;}}
  .hstat{{text-align:center;}}
  .hstat-val{{font-family:'Bebas Neue',sans-serif;font-size:38px;color:var(--gold);letter-spacing:2px;}}
  .hstat-label{{font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-top:2px;}}
  .tabs{{display:flex;justify-content:center;gap:4px;padding:0 40px 30px;flex-wrap:wrap;}}
  .tab-btn{{background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:10px 22px;
    border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;letter-spacing:.5px;cursor:pointer;transition:all .2s;}}
  .tab-btn:hover{{color:var(--text);border-color:rgba(255,255,255,.15);}}
  .tab-btn.active{{background:var(--gold);color:#060d18;border-color:var(--gold);font-weight:700;}}
  .content{{padding:0 40px 60px;max-width:1400px;margin:0 auto;}}
  .section{{display:none;}}.section.active{{display:block;}}
  .section-title{{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:3px;color:var(--gold);margin-bottom:6px;}}
  .section-sub{{color:var(--muted);font-size:13px;margin-bottom:30px;letter-spacing:.5px;}}
  .grid-2{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}}
  .grid-3{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:24px;}}
  @media(max-width:900px){{.grid-2,.grid-3{{grid-template-columns:1fr;}}}}
  .card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;}}
  .card-title{{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;}}
  .chart-wrap{{position:relative;height:340px;}}
  .chart-wrap-lg{{position:relative;height:460px;}}
  .chart-wrap-sm{{position:relative;height:240px;}}
  .rank-table{{width:100%;border-collapse:collapse;font-size:13px;}}
  .rank-table th{{text-align:left;color:var(--muted);font-weight:600;font-size:11px;letter-spacing:1.5px;
    text-transform:uppercase;padding:8px 10px;border-bottom:1px solid var(--border);}}
  .rank-table th.r,.rank-table td.r{{text-align:right;}}
  .rank-table td{{padding:10px;border-bottom:1px solid rgba(255,255,255,.04);}}
  .rank-table tr:hover td{{background:rgba(255,255,255,.03);}}
  .rank-num{{color:var(--muted);font-size:12px;font-weight:700;width:28px;display:inline-block;}}
  .badge-group{{display:inline-block;background:var(--blue);color:#fff;font-size:10px;font-weight:700;
    padding:1px 7px;border-radius:4px;margin-left:6px;vertical-align:middle;letter-spacing:.5px;}}
  .bar-mini{{display:inline-block;height:6px;border-radius:3px;
    background:linear-gradient(90deg,var(--blue),var(--blue-light));vertical-align:middle;margin-right:8px;}}
  .groupes-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}}
  @media(max-width:1100px){{.groupes-grid{{grid-template-columns:repeat(2,1fr);}}}}
  @media(max-width:600px){{.groupes-grid{{grid-template-columns:1fr;}}}}
  .groupe-card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}}
  .groupe-header{{background:var(--blue);padding:10px 16px;display:flex;align-items:center;gap:10px;}}
  .groupe-letter{{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--gold);letter-spacing:2px;line-height:1;}}
  .groupe-label{{font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;}}
  .groupe-body{{padding:10px 0;}}
  .groupe-team{{display:flex;align-items:center;justify-content:space-between;padding:7px 16px;font-size:13px;transition:background .15s;}}
  .groupe-team:hover{{background:rgba(255,255,255,.04);}}
  .groupe-team.favori{{background:rgba(240,192,64,.07);border-left:3px solid var(--gold);}}
  .groupe-team .pts{{font-size:12px;color:var(--muted);}}
  .groupe-team .pts span{{color:var(--gold);font-weight:700;}}
  .debutant-tag{{font-size:9px;background:rgba(239,68,68,.2);color:#ef4444;border-radius:3px;
    padding:1px 5px;margin-left:4px;letter-spacing:.5px;font-weight:700;text-transform:uppercase;}}
  .champion-card{{background:linear-gradient(135deg,var(--surface2) 0%,var(--surface) 100%);
    border:1px solid rgba(240,192,64,.2);border-radius:var(--radius);padding:20px;
    display:flex;align-items:center;gap:16px;}}
  .champion-trophies{{font-size:28px;line-height:1;min-width:60px;text-align:center;}}
  .champion-name{{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;}}
  .champion-meta{{font-size:12px;color:var(--muted);margin-top:4px;}}
  .champion-group{{font-size:11px;color:var(--gold);font-weight:700;margin-top:4px;letter-spacing:1px;}}
  .cache-badge{{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.12);
    border:1px solid rgba(34,197,94,.3);border-radius:20px;padding:4px 12px;
    font-size:11px;color:var(--green);letter-spacing:.5px;margin-bottom:20px;}}
  .cache-dot{{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}}
  @keyframes pulse{{0%,100%{{opacity:1;}}50%{{opacity:.4;}}}}
  .info-box{{background:var(--surface2);border:1px solid var(--border);border-radius:8px;
    padding:12px 16px;font-size:12px;color:var(--muted);margin-top:12px;line-height:1.6;}}
  footer{{text-align:center;padding:24px;color:var(--muted);font-size:12px;
    border-top:1px solid var(--border);letter-spacing:.5px;}}
</style>
</head>
<body>
<header>
  <div class="header-badge">PROJET DATA SCIENCE</div>
  <div style="background: rgba(240, 192, 64, 0.08); border: 1px solid rgba(240, 192, 64, 0.3); border-radius: 12px; padding: 12px 28px; display: inline-block; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
    <div style="font-size: 11px; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; font-weight: bold;">Coup d'envoi de la Coupe du Monde</div>
    <div id="countdown" style="font-family:'Bebas Neue',sans-serif; color: white; font-size: 42px; letter-spacing: 4px; line-height: 1; text-shadow: 0 0 10px rgba(255,255,255,0.2);">⏳ CALCUL EN COURS...</div>
  </div>
  <h1>FIFA WORLD<br>CUP 2026</h1>
  <p>Analyse historique des équipes qualifiées • Dataset Kaggle 1872–2025</p>
  <div class="header-stats" id="headerStats"></div>
</header>
<div class="tabs" id="tabsNav"></div>
<div class="content">
  <div class="section active" id="sec-classement">
    <div class="section-title">CLASSEMENT HISTORIQUE</div>
    <div class="section-sub">Points cumulés en FIFA World Cup de toutes les équipes qualifiées pour 2026</div>
    <div class="cache-badge"><span class="cache-dot"></span> Données en cache localStorage</div>
    <div class="grid-2">
      <div class="card"><div class="card-title">Top 10 — Points historiques</div><div class="chart-wrap"><canvas id="chartPoints"></canvas></div></div>
      <div class="card"><div class="card-title">Top 10 — Taux de victoire (%)</div><div class="chart-wrap"><canvas id="chartTaux"></canvas></div></div>
    </div>
    <div class="card"><div class="card-title">Classement complet</div><table class="rank-table" id="rankTable"></table></div>
  </div>
  <div class="section" id="sec-groupes">
    <div class="section-title">GROUPES 2026</div>
    <div class="section-sub">Tirage au sort FIFA — 5 décembre 2025 • 12 groupes • 48 équipes</div>
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card"><div class="card-title">Moyenne pts historiques par grupo</div><div class="chart-wrap"><canvas id="chartGroupPts"></canvas></div></div>
      <div class="card"><div class="card-title">Favori vs promedio del grupo</div><div class="chart-wrap"><canvas id="chartGroupFavori"></canvas></div></div>
    </div>
    <div class="groupes-grid" id="groupesGrid"></div>
  </div>
  <div class="section" id="sec-scatter">
    <div class="section-title">PERFORMANCE GLOBALE</div>
    <div class="section-sub">Taux de victoire vs. points historiques — toutes les équipes qualifiées</div>
    <div class="card"><div class="card-title">Scatter — Taux victoire × Points</div><div class="chart-wrap-lg"><canvas id="chartScatter"></canvas></div>
      <div class="info-box">⚡ X : Taux de victoire (%). Y : Points historiques (V×3 + N×1). Les lignes marquent 50% et 50 pts.</div>
    </div>
    <div class="grid-3" style="margin-top:20px">
      <div class="card"><div class="card-title">Distribution — Parties jouées</div><div class="chart-wrap-sm"><canvas id="chartPJ"></canvas></div></div>
      <div class="card"><div class="card-title">Distribution — Buts pour</div><div class="chart-wrap-sm"><canvas id="chartBF"></canvas></div></div>
      <div class="card"><div class="card-title">Buts pour vs contre (Top 12)</div><div class="chart-wrap-sm"><canvas id="chartButs"></canvas></div></div>
    </div>
  </div>
  <div class="section" id="sec-palmares">
    <div class="section-title">PALMARÈS</div>
    <div class="section-sub">Champions du monde qualifiés pour 2026</div>
    <div class="card" style="margin-bottom:20px"><div class="card-title">Titres FIFA World Cup</div><div class="chart-wrap"><canvas id="chartPalmares"></canvas></div></div>
    <div id="palmaresCards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;"></div>
  </div>
  <div class="section" id="sec-pronostics">
    <div class="section-title">SIMULATEUR DE MATCH</div>
    <div class="section-sub">Prédiction basée sur la distribution de Poisson (matchs internationaux depuis 2014)</div>
    
    <div class="card" style="margin-bottom:20px; text-align:center; padding-bottom:0;">
      <div class="card-title">TOP 5 FAVORIS DU TOURNOI (MODÈLE MATHÉMATIQUE)</div>
      <div id="top5-predictions" style="display:flex; justify-content:center; align-items:flex-end; gap:20px; height:140px; margin-top:10px; border-bottom:1px solid rgba(255,255,255,0.05);"></div>
    </div>
    
    <div class="card" style="margin-bottom:20px; text-align:center;">
      <div style="display:flex; justify-content:center; align-items:center; gap:20px; margin-bottom:20px;">
        <select id="teamA-select" style="padding:10px; border-radius:6px; background:var(--surface2); color:white; border:1px solid var(--border); font-size:16px; font-weight:bold;"></select>
        <div style="font-family:'Bebas Neue', sans-serif; font-size:24px; color:var(--gold);">VS</div>
        <select id="teamB-select" style="padding:10px; border-radius:6px; background:var(--surface2); color:white; border:1px solid var(--border); font-size:16px; font-weight:bold;"></select>
      </div>
      <button id="btn-simuler" style="background:var(--blue); color:white; padding:12px 30px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:16px; transition:0.2s;">SIMULER</button>
    </div>
    <div class="grid-2" id="prediction-results" style="display:none;">
      <div class="card" style="text-align:center;">
        <div class="card-title">Expected Goals (xG)</div>
        <div style="display:flex; justify-content:space-around; align-items:center; height:100%; padding-bottom:30px;">
          <div><div id="xg-teamA" style="font-family:'Bebas Neue', sans-serif; font-size:64px; color:#4ade80;">0.0</div><div id="xg-nameA" style="color:var(--muted); font-size:14px; font-weight:bold; text-transform:uppercase;">Team A</div></div>
          <div><div id="xg-teamB" style="font-family:'Bebas Neue', sans-serif; font-size:64px; color:#f87171;">0.0</div><div id="xg-nameB" style="color:var(--muted); font-size:14px; font-weight:bold; text-transform:uppercase;">Team B</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Probabilités (Loi de Poisson)</div>
        <div class="chart-wrap-sm"><canvas id="chartPoisson"></canvas></div>
      </div>
    </div>
  </div>
</div>
<footer>⚽ Analyse du Football International 1872–2025 · Dataset Kaggle (martj42) · Projet Data Science</footer>

<script>
// ── Datos inyectados desde Python ────────────────────────
const RAW_STATS  = {stats_json};
const GROUPES    = {groupes_json};
const PREDICTIONS = {predictions_json};
const RAW_H2H    = {h2h_json};
const CACHE_KEY  = "wc2026_stats_v1";

// ── Cache localStorage ────────────────────────────────────
function initCache() {{
  try {{
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {{
      const p = JSON.parse(cached);
      if (Date.now() - p.ts < 86400000) {{
        console.log("✅ Cache localStorage actif");
        return p.data;
      }}
    }}
  }} catch(e) {{}}
  const data = {{ stats: [...RAW_STATS].sort((a,b) => b.PTS - a.PTS) }};
  try {{ localStorage.setItem(CACHE_KEY, JSON.stringify({{ ts: Date.now(), data }})); }} catch(e) {{}}
  console.log("✅ Données mises en cache");
  return data;
}}

// ── Tabs ──────────────────────────────────────────────────
const TABS = [
  {{id:"classement",label:"🏆 Classement"}},
  {{id:"groupes",   label:"🗂️ Groupes 2026"}},
  {{id:"scatter",   label:"📊 Performance"}},
  {{id:"palmares",  label:"🥇 Palmarès"}},
  {{id:"pronostics",label:"🔮 Pronostics"}},
];
function initTabs() {{
  const nav = document.getElementById("tabsNav");
  TABS.forEach(t => {{
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (t.id==="classement"?" active":"");
    btn.textContent = t.label;
    btn.onclick = () => {{
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      document.getElementById("sec-"+t.id).classList.add("active");
      btn.classList.add("active");
    }};
    nav.appendChild(btn);
  }});
}}

// ── Chart.js defaults ─────────────────────────────────────
Chart.defaults.color = "#7a90a8";
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 12;

// ── Header stats ──────────────────────────────────────────
function renderHeaderStats(stats) {{
  const el = document.getElementById("headerStats");
  const items = [
    {{val:"48",                               label:"Équipes qualifiées"}},
    {{val:"12",                               label:"Groupes"}},
    {{val:stats.reduce((a,b)=>a+b.BF,0).toLocaleString(), label:"Buts historiques"}},
    {{val:stats.filter(s=>s.titres>0).length, label:"Ex-champions"}},
    {{val:stats.filter(s=>s.PJ===0).length,   label:"Débutants en CM"}},
  ];
  items.forEach(i => {{
    el.innerHTML += `<div class="hstat"><div class="hstat-val">${{i.val}}</div><div class="hstat-label">${{i.label}}</div></div>`;
  }});
}}

// ── Classement ────────────────────────────────────────────
function renderClassement(stats) {{
  const top10 = stats.slice(0,10);
  const ctx1 = document.getElementById("chartPoints").getContext("2d");
  const g1 = ctx1.createLinearGradient(0,0,500,0);
  g1.addColorStop(0,"#f0c040"); g1.addColorStop(1,"#185fa5");
  new Chart(ctx1,{{type:"bar",data:{{labels:[...top10.map(s=>s.equipe)].reverse(),
    datasets:[{{data:[...top10.map(s=>s.PTS)].reverse(),backgroundColor:g1,borderRadius:6,borderSkipped:false}}]}},
    options:{{indexAxis:"y",responsive:true,maintainAspectRatio:false,
      plugins:{{legend:{{display:false}},tooltip:{{callbacks:{{label:c=>" "+c.raw+" pts"}}}}}},
      scales:{{x:{{grid:{{color:"rgba(255,255,255,.04)"}}}},y:{{grid:{{display:false}},ticks:{{color:"#e8eef6",font:{{weight:"600"}}}}}}}}
    }}}});

  const ctx2 = document.getElementById("chartTaux").getContext("2d");
  const colors = [...top10.map(s=>s.taux_V)].reverse().map((_,i)=>i===9?"#f0c040":i>=7?"#185fa5":"#4a9eff");
  new Chart(ctx2,{{type:"bar",data:{{labels:[...top10.map(s=>s.equipe)].reverse(),
    datasets:[{{data:[...top10.map(s=>s.taux_V)].reverse(),backgroundColor:colors,borderRadius:6,borderSkipped:false}}]}},
    options:{{indexAxis:"y",responsive:true,maintainAspectRatio:false,
      plugins:{{legend:{{display:false}},tooltip:{{callbacks:{{label:c=>" "+c.raw+"%"}}}}}},
      scales:{{x:{{grid:{{color:"rgba(255,255,255,.04)"}},ticks:{{callback:v=>v+"%"}},max:80}},y:{{grid:{{display:false}},ticks:{{color:"#e8eef6",font:{{weight:"600"}}}}}}}}
    }}}});

  const table = document.getElementById("rankTable");
  const maxPts = stats[0].PTS;
  table.innerHTML = `<thead><tr><th>#</th><th>Équipe</th><th class="r">PJ</th><th class="r">V</th>
    <th class="r">N</th><th class="r">D</th><th class="r">BF</th><th class="r">BC</th>
    <th class="r">DB</th><th class="r">PTS</th><th class="r">%V</th><th class="r">🏆</th></tr></thead><tbody>`;
  stats.forEach((s,i) => {{
    const bw = Math.round(s.PTS/maxPts*80);
    const dbColor = s.DB>0?"#22c55e":s.DB<0?"#ef4444":"#7a90a8";
    const dbVal   = s.DB>0?"+"+s.DB:s.DB;
    table.innerHTML += `<tr>
      <td><span class="rank-num">${{i+1}}</span></td>
      <td><span class="bar-mini" style="width:${{bw}}px"></span>
          <span style="font-weight:600">${{s.equipe}}</span>
          <span class="badge-group">${{s.groupe}}</span></td>
      <td class="r">${{s.PJ}}</td><td class="r">${{s.V}}</td><td class="r">${{s.N}}</td><td class="r">${{s.D}}</td>
      <td class="r">${{s.BF}}</td><td class="r">${{s.BC}}</td>
      <td class="r" style="color:${{dbColor}}">${{dbVal}}</td>
      <td class="r" style="font-weight:700;color:${{s.PTS>0?"#f0c040":"#7a90a8"}}">${{s.PTS}}</td>
      <td class="r">${{s.taux_V}}%</td>
      <td class="r">${{s.titres>0?"🏆".repeat(s.titres):"—"}}</td></tr>`;
  }});
  table.innerHTML += "</tbody>";
}}

// ── Groupes ───────────────────────────────────────────────
function renderGroupes(stats) {{
  const statMap = {{}};
  stats.forEach(s => statMap[s.equipe] = s);
  const gLabels = Object.keys(GROUPES).sort();
  const gMoy = gLabels.map(g => Math.round(GROUPES[g].map(e=>statMap[e]?.PTS||0).reduce((a,b)=>a+b,0)/GROUPES[g].length));
  const gFav = gLabels.map(g => Math.max(...GROUPES[g].map(e=>statMap[e]?.PTS||0)));

  const g3 = ctx3 => {{
    const ctx = document.getElementById("chartGroupPts").getContext("2d");
    const gr  = ctx.createLinearGradient(0,0,0,300);
    gr.addColorStop(0,"#f0c040"); gr.addColorStop(1,"#185fa5");
    new Chart(ctx,{{type:"bar",data:{{labels:gLabels.map(g=>"Gr. "+g),datasets:[{{label:"Pts moy.",data:gMoy,backgroundColor:gr,borderRadius:6}}]}},
      options:{{responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}}}},
        scales:{{x:{{grid:{{display:false}},ticks:{{color:"#e8eef6"}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
      }}}});
  }}; g3();

  new Chart(document.getElementById("chartGroupFavori").getContext("2d"),{{type:"bar",
    data:{{labels:gLabels.map(g=>"Gr. "+g),datasets:[
      {{label:"Favori (pts)",data:gFav,backgroundColor:"rgba(240,192,64,.85)",borderRadius:6}},
      {{label:"Moyenne (pts)",data:gMoy,backgroundColor:"rgba(74,158,255,.6)",borderRadius:6}},
    ]}},
    options:{{responsive:true,maintainAspectRatio:false,
      plugins:{{legend:{{labels:{{color:"#e8eef6"}}}}}},
      scales:{{x:{{grid:{{display:false}},ticks:{{color:"#e8eef6"}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
    }}}});

  const grid = document.getElementById("groupesGrid");
  gLabels.forEach(g => {{
    const eqs = GROUPES[g].map(e => statMap[e]||{{equipe:e,PTS:0,PJ:0}}).sort((a,b)=>b.PTS-a.PTS);
    const maxP = eqs[0]?.PTS||0;
    let html = eqs.map((s,i) => {{
      const isNew = s.PJ===0;
      const isFav = i===0 && maxP>0;
      return `<div class="groupe-team ${{isFav?"favori":""}}">
        <span>${{s.equipe}}${{isNew?'<span class="debutant-tag">NEW</span>':""}}</span>
        <span class="pts">${{s.PTS>0?`<span>${{s.PTS}}</span> pts`:'<span style="color:#7a90a8">0</span> pts'}}</span>
      </div>`;
    }}).join("");
    grid.innerHTML += `<div class="groupe-card">
      <div class="groupe-header"><div>
        <div class="groupe-letter">G ${{g}}</div>
        <div class="groupe-label">Groupe ${{g}}</div>
      </div></div>
      <div class="groupe-body">${{html}}</div>
    </div>`;
  }});
}}

// ── Scatter + Distribuciones ──────────────────────────────
function renderScatter(stats) {{
  const gColors = {{"A":"#ef4444","B":"#f97316","C":"#eab308","D":"#22c55e",
    "E":"#14b8a6","F":"#3b82f6","G":"#8b5cf6","H":"#ec4899",
    "I":"#f0c040","J":"#4ade80","K":"#38bdf8","L":"#fb923c"}};
  const byG = {{}};
  stats.forEach(s => {{ if(!byG[s.groupe]) byG[s.groupe]=[]; byG[s.groupe].push(s); }});
  const datasets = Object.entries(byG).map(([g,pts]) => ({{
    label:"Groupe "+g, backgroundColor:gColors[g]||"#888", pointRadius:7, pointHoverRadius:10,
    data:pts.map(s=>({{x:s.taux_V,y:s.PTS,label:s.equipe}}))
  }}));
  new Chart(document.getElementById("chartScatter").getContext("2d"),{{
    type:"scatter", data:{{datasets}},
    options:{{responsive:true,maintainAspectRatio:false,
      plugins:{{legend:{{labels:{{color:"#7a90a8",boxWidth:10}},position:"right"}},
        tooltip:{{callbacks:{{label:c=>`${{c.raw.label}} — ${{c.raw.x}}% / ${{c.raw.y}} pts`}}}}}},
      scales:{{
        x:{{title:{{display:true,text:"Taux de victoire (%)",color:"#7a90a8"}},grid:{{color:"rgba(255,255,255,.04)"}},ticks:{{color:"#7a90a8",callback:v=>v+"%"}}}},
        y:{{title:{{display:true,text:"Points historiques",color:"#7a90a8"}},grid:{{color:"rgba(255,255,255,.04)"}},ticks:{{color:"#7a90a8"}}}}
      }}
    }}
  }});

  const sPJ = [...stats].sort((a,b)=>b.PJ-a.PJ).slice(0,15);
  new Chart(document.getElementById("chartPJ").getContext("2d"),{{type:"bar",
    data:{{labels:sPJ.map(s=>s.equipe.split(" ")[0]),datasets:[{{data:sPJ.map(s=>s.PJ),backgroundColor:"#185fa5",borderRadius:4}}]}},
    options:{{responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}}}},
      scales:{{x:{{grid:{{display:false}},ticks:{{color:"#7a90a8",font:{{size:9}}}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
    }}}});

  const sBF = [...stats].sort((a,b)=>b.BF-a.BF).slice(0,15);
  new Chart(document.getElementById("chartBF").getContext("2d"),{{type:"bar",
    data:{{labels:sBF.map(s=>s.equipe.split(" ")[0]),datasets:[{{data:sBF.map(s=>s.BF),backgroundColor:"#22c55e",borderRadius:4}}]}},
    options:{{responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}}}},
      scales:{{x:{{grid:{{display:false}},ticks:{{color:"#7a90a8",font:{{size:9}}}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
    }}}});

  const t12 = [...stats].filter(s=>s.PJ>0).sort((a,b)=>b.PTS-a.PTS).slice(0,12);
  new Chart(document.getElementById("chartButs").getContext("2d"),{{type:"bar",
    data:{{labels:t12.map(s=>s.equipe.split(" ")[0]),datasets:[
      {{label:"Buts pour",data:t12.map(s=>s.BF),backgroundColor:"rgba(240,192,64,.8)",borderRadius:3}},
      {{label:"Buts contre",data:t12.map(s=>s.BC),backgroundColor:"rgba(239,68,68,.6)",borderRadius:3}},
    ]}},
    options:{{responsive:true,maintainAspectRatio:false,
      plugins:{{legend:{{labels:{{color:"#7a90a8",boxWidth:10,font:{{size:10}}}}}}}},
      scales:{{x:{{grid:{{display:false}},ticks:{{color:"#7a90a8",font:{{size:9}}}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
    }}}});
}}

// ── Palmarès ──────────────────────────────────────────────
function renderPalmares(stats) {{
  const champs = stats.filter(s=>s.titres>0).sort((a,b)=>b.titres-a.titres);
  const ctx = document.getElementById("chartPalmares").getContext("2d");
  const gP = ctx.createLinearGradient(0,0,0,300);
  gP.addColorStop(0,"#f0c040"); gP.addColorStop(1,"#e8a820");
  new Chart(ctx,{{type:"bar",data:{{labels:champs.map(s=>s.equipe),datasets:[
    {{label:"Titres",data:champs.map(s=>s.titres),backgroundColor:gP,borderRadius:6}},
    {{label:"Finales",data:champs.map(s=>s.finales),backgroundColor:"rgba(74,158,255,.5)",borderRadius:6}},
  ]}},options:{{responsive:true,maintainAspectRatio:false,
    plugins:{{legend:{{labels:{{color:"#e8eef6"}}}}}},
    scales:{{x:{{grid:{{display:false}},ticks:{{color:"#e8eef6",font:{{weight:"600"}}}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}},ticks:{{stepSize:1}}}}}}
  }}}});

  const container = document.getElementById("palmaresCards");
  stats.filter(s=>s.titres>0||s.finales>0).sort((a,b)=>b.titres-a.titres||b.finales-a.finales)
    .forEach(s => {{
      container.innerHTML += `<div class="champion-card">
        <div class="champion-trophies">${{s.titres>0?"🏆".repeat(s.titres):"🥈"}}</div>
        <div>
          <div class="champion-name">${{s.equipe}}</div>
          <div class="champion-meta"><strong>${{s.titres}}</strong> titre${{s.titres>1?"s":""}} ·
            <strong>${{s.finales}}</strong> finale${{s.finales>1?"s":""}}
            ${{s.annees!=="—"?` · <span style="color:#f0c040">${{s.annees}}</span>`:""}}</div>
          <div class="champion-group">Groupe ${{s.groupe}} · ${{s.PTS}} pts · ${{s.taux_V}}% victoires</div>
        </div>
      </div>`;
    }});
}}

// ── Init ──────────────────────────────────────────────────
(function() {{
  initTabs();
  const {{ stats }} = initCache();
  renderHeaderStats(stats);
  renderClassement(stats);
  renderGroupes(stats);
  renderScatter(stats);
  renderPalmares(stats);
  if(typeof renderPronostics === 'function') renderPronostics(stats);
}})();

// ── Pronostics (Poisson) ──────────────────────────────────
let poissonChart = null;
function fact(n) {{ return n <= 1 ? 1 : n * fact(n - 1); }}
function poisson(k, lambda) {{ return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / fact(k); }}

function renderPronostics(stats) {{
  const selectA = document.getElementById("teamA-select");
  const selectB = document.getElementById("teamB-select");
  
  const teams = stats.map(s => s.equipe).sort();
  teams.forEach(t => {{
    selectA.innerHTML += `<option value="${{t}}">${{t}}</option>`;
    selectB.innerHTML += `<option value="${{t}}">${{t}}</option>`;
  }});
  
  if(teams.includes("France")) selectA.value = "France";
  if(teams.includes("Argentina")) selectB.value = "Argentina";

  const strMap = {{}};
  if(PREDICTIONS && PREDICTIONS.strengths) {{
      PREDICTIONS.strengths.forEach(s => strMap[s.equipe] = s);
      
      // Top 5 Favoris : Power Index = Attack / (Defense + 0.1)
      const powerList = PREDICTIONS.strengths.map(s => ({{
        equipe: s.equipe,
        power: s.attack_strength / Math.max(s.defense_weakness, 0.1)
      }})).sort((a,b) => b.power - a.power);
      
      const top5 = powerList.slice(0, 5);
      const top5container = document.getElementById("top5-predictions");
      const maxPower = top5[0].power;
      
      top5.forEach((t, i) => {{
        const height = (t.power / maxPower) * 100;
        const color = i === 0 ? "var(--gold)" : (i === 1 ? "#cbd5e1" : (i === 2 ? "#b45309" : "var(--blue-light)"));
        top5container.innerHTML += `
          <div style="display:flex; flex-direction:column; align-items:center; width:80px;">
            <div style="font-weight:bold; font-size:16px; color:${{color}}; margin-bottom:4px;">${{t.power.toFixed(1)}}</div>
            <div style="width:100%; height:${{height}}px; background:${{color}}; border-radius:4px 4px 0 0; opacity:0.8; transition:0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8"></div>
            <div style="font-size:11px; color:var(--muted); font-weight:bold; text-transform:uppercase; margin-top:8px; padding-bottom:8px;">${{t.equipe.substring(0,10)}}</div>
          </div>
        `;
      }});
  }}

  document.getElementById("btn-simuler").onclick = () => {{
    const teamA = selectA.value;
    const teamB = selectB.value;
    if(teamA === teamB) {{ alert("Veuillez sélectionner deux équipes différentes."); return; }}
    
    document.getElementById("prediction-results").style.display = "grid";
    
    const strA = strMap[teamA] || {{ attack_strength: 1, defense_weakness: 1 }};
    const strB = strMap[teamB] || {{ attack_strength: 1, defense_weakness: 1 }};
    const avg = PREDICTIONS.global_avg || 1.3;
    
    const xgA = strA.attack_strength * strB.defense_weakness * avg;
    const xgB = strB.attack_strength * strA.defense_weakness * avg;
    
    document.getElementById("xg-nameA").textContent = teamA;
    document.getElementById("xg-teamA").textContent = xgA.toFixed(2);
    document.getElementById("xg-nameB").textContent = teamB;
    document.getElementById("xg-teamB").textContent = xgB.toFixed(2);
    
    let probA = 0, probB = 0, probDraw = 0;
    for(let i=0; i<=5; i++) {{
      for(let j=0; j<=5; j++) {{
        const p = poisson(i, xgA) * poisson(j, xgB);
        if(i > j) probA += p;
        else if(i < j) probB += p;
        else probDraw += p;
      }}
    }}
    
    const sum = probA + probB + probDraw;
    probA = (probA/sum)*100;
    probB = (probB/sum)*100;
    probDraw = (probDraw/sum)*100;
    
    if(poissonChart) poissonChart.destroy();
    const ctx = document.getElementById("chartPoisson").getContext("2d");
    poissonChart = new Chart(ctx, {{
      type: "doughnut",
      data: {{
        labels: [`Victoire ${{teamA}}`, "Match Nul", `Victoire ${{teamB}}`],
        datasets: [{{
          data: [probA.toFixed(1), probDraw.toFixed(1), probB.toFixed(1)],
          backgroundColor: ["#4ade80", "#f0c040", "#f87171"],
          borderWidth: 0,
          hoverOffset: 4
        }}]
      }},
      options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{
          legend: {{ position: "right", labels: {{ color: "#e8eef6", padding: 15 }} }},
          tooltip: {{ callbacks: {{ label: c => ` ${{c.raw}}%` }} }}
        }},
        cutout: "65%"
      }}
    }});
  }};
}}

// ── Countdown Timer ───────────────────────────────────────
function initCountdown() {{
  const targetDate = new Date("June 11, 2026 00:00:00").getTime();
  const el = document.getElementById("countdown");
  
  setInterval(() => {{
    const now = new Date().getTime();
    const distance = targetDate - now;
    
    if (distance < 0) {{
      el.innerHTML = "🏆 LA COUPE DU MONDE EST COMMENCÉE !";
      return;
    }}
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    el.innerHTML = `J-${{days}} <span style="color:var(--muted); font-size:32px; vertical-align:middle; margin:0 8px;">|</span> ${{hours.toString().padStart(2,"0")}}:${{minutes.toString().padStart(2,"0")}}:${{seconds.toString().padStart(2,"0")}}`;
  }}, 1000);
}}

initCountdown();
</script>
</body>
</html>"""

# ── Guardar el archivo ────────────────────────────────────
output_path = "outputs/wc2026_dashboard.html"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅ Dashboard HTML generado: {output_path}")

# En Google Colab — mostrar link de descarga
from IPython.display import FileLink, display
display(FileLink(output_path))