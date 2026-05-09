"""
EXPORTACIÓN — Dashboard HTML interactivo
Genera wc2026_dashboard.html en la carpeta outputs/
"""

import json
import os
import pandas as pd

os.makedirs("outputs", exist_ok=True)

# ── Preparar datos desde tus DataFrames ya calculados ────
# NOTA: Asegúrate de que stats_wc y groupes_2026 estén disponibles
# Puedes importarlos desde tu notebook o cargarlos aquí

try:
    # Intenta cargar desde variables globales o importar
    stats_wc = globals().get('stats_wc')
    groupes_2026 = globals().get('groupes_2026')
    
    if stats_wc is None or groupes_2026 is None:
        print("⚠️  Advertencia: stats_wc o groupes_2026 no encontrados. Usando datos de ejemplo.")
        stats_wc = pd.DataFrame()  # DataFrame vacío de ejemplo
        groupes_2026 = {}  # Dict vacío de ejemplo
except Exception as e:
    print(f"⚠️  Error al cargar datos: {e}")
    stats_wc = pd.DataFrame()
    groupes_2026 = {}

stats_export = []
if not stats_wc.empty:
    for _, row in stats_wc.iterrows():
        stats_export.append({
            "equipe":      str(row.get("equipe", "")),
            "PJ":          int(row.get("PJ", 0)),
            "V":           int(row.get("V", 0)),
            "N":           int(row.get("N", 0)),
            "D":           int(row.get("D", 0)),
            "BF":          int(row.get("BF", 0)),
            "BC":          int(row.get("BC", 0)),
            "DB":          int(row.get("DB", 0)),
            "PTS":         int(row.get("PTS", 0)),
            "taux_V":      float(row.get("taux_V", 0)),
            "titres":      int(row.get("titres", 0)),
            "finales":     int(row.get("finales", 0)),
            "annees":      str(row.get("annees_titres", "—")),
            "groupe":      str(row.get("groupe", "")),
        })

groupes_export = groupes_2026

# Convertir a JSON para inyectar en el HTML
stats_json = json.dumps(stats_export, ensure_ascii=False)
groupes_json = json.dumps(groupes_export, ensure_ascii=False)

# ── Template HTML ────────────────────────────────────────
html_template = f"""<!DOCTYPE html>
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
    pointer-events:none;
  }}
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
</div>
<footer>⚽ Analyse du Football International 1872–2025 · Dataset Kaggle (martj42) · Projet Data Science</footer>

<script>
const RAW_STATS  = {stats_json};
const GROUPES    = {groupes_json};
const CACHE_KEY  = "wc2026_stats_v1";

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

const TABS = [
  {{id:"classement",label:"🏆 Classement"}},
  {{id:"groupes",   label:"🗂️ Groupes 2026"}},
  {{id:"scatter",   label:"📊 Performance"}},
  {{id:"palmares",  label:"🥇 Palmarès"}},
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

Chart.defaults.color = "#7a90a8";
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 12;

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

function renderGroupes(stats) {{
  const statMap = {{}};
  stats.forEach(s => statMap[s.equipe] = s);
  const gLabels = Object.keys(GROUPES).sort();
  const gMoy = gLabels.map(g => Math.round(GROUPES[g].map(e=>statMap[e]?.PTS||0).reduce((a,b)=>a+b,0)/GROUPES[g].length));
  const gFav = gLabels.map(g => Math.max(...GROUPES[g].map(e=>statMap[e]?.PTS||0)));

  new Chart(document.getElementById("chartGroupPts").getContext("2d"),{{type:"bar",
    data:{{labels:gLabels.map(g=>"Gr. "+g),datasets:[{{label:"Pts moy.",data:gMoy,backgroundColor:"#185fa5",borderRadius:6}}]}},
    options:{{responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}}}},
      scales:{{x:{{grid:{{display:false}},ticks:{{color:"#e8eef6"}}}},y:{{grid:{{color:"rgba(255,255,255,.04)"}}}}}}
    }}}});

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
            <strong>${{{s.finales}}}</strong> finale${{s.finales>1?"s":""}}
            ${{s.annees!=="—"?` · <span style="color:#f0c040">${{s.annees}}</span>`:""}}</div>
          <div class="champion-group">Groupe ${{s.groupe}} · ${{s.PTS}} pts · ${{s.taux_V}}% victoires</div>
        </div>
      </div>`;
    }});
}}

(function() {{
  initTabs();
  const {{ stats }} = initCache();
  renderHeaderStats(stats);
  renderClassement(stats);
  renderGroupes(stats);
  renderScatter(stats);
  renderPalmares(stats);
}})();
</script>
</body>
</html>"""

# ── Guardar el archivo ────────────────────────────────────
output_path = "outputs/wc2026_dashboard.html"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_template)

print(f"✅ Dashboard HTML generado: {output_path}")
print(f"📊 Estadísticas exportadas: {len(stats_export)} equipos")
print(f"🗂️  Grupos generados: {len(groupes_export)} grupos")
