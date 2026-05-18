// ── Groupes 2026 ─────────────────────────────────────────
function renderGroupes(stats) {
  const statMap = {};
  stats.forEach(s => statMap[s.equipe] = s);
  const gLabels = Object.keys(GROUPES).sort();
  const gMoy = gLabels.map(g => Math.round(GROUPES[g].map(e => statMap[e]?.PTS || 0).reduce((a, b) => a + b, 0) / GROUPES[g].length));
  const gFav = gLabels.map(g => Math.max(...GROUPES[g].map(e => statMap[e]?.PTS || 0)));

  const ctxGP = document.getElementById("chartGroupPts");
  if (ctxGP) {
    const ctx = ctxGP.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: gLabels.map(g => "Gr. " + g),
        datasets: [{
          label: "Pts moy.",
          data: gMoy,
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "#f0c040";
            const gr = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gr.addColorStop(0, "#f0c040");
            gr.addColorStop(1, "#185fa5");
            return gr;
          },
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#e8eef6",
              font: { size: 11 },
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  const ctxGF = document.getElementById("chartGroupFavori");
  if (ctxGF) {
    new Chart(ctxGF.getContext("2d"), {
      type: "bar",
      data: {
        labels: gLabels.map(g => "Gr. " + g),
        datasets: [
          { label: "Favori (pts)", data: gFav, backgroundColor: "rgba(240,192,64,.85)", borderRadius: 6 },
          { label: "Moyenne (pts)", data: gMoy, backgroundColor: "rgba(74,158,255,.6)", borderRadius: 6 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#e8eef6", font: { size: 11 }, boxWidth: 12, padding: 12 },
            position: "bottom"
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#e8eef6",
              font: { size: 11 },
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  const grid = document.getElementById("groupesGrid");
  if (!grid) return;
  gLabels.forEach(g => {
    const eqs = GROUPES[g].map(e => statMap[e] || { equipe: e, PTS: 0, PJ: 0 }).sort((a, b) => b.PTS - a.PTS);
    const maxP = eqs[0]?.PTS || 0;
    let html = eqs.map((s, i) => {
      const isNew = s.PJ === 0;
      const isFav = i === 0 && maxP > 0;
      return `<div class="groupe-team ${isFav ? "favori" : ""}">
        <span>${s.equipe}${isNew ? '<span class="debutant-tag">NEW</span>' : ""}</span>
        <span class="pts">${s.PTS > 0 ? `<span>${s.PTS}</span> pts` : '<span style="color:#7a90a8">0</span> pts'}</span>
      </div>`;
    }).join("");
    grid.innerHTML += `<div class="groupe-card">
      <div class="groupe-header"><div>
        <div class="groupe-letter">G ${g}</div>
        <div class="groupe-label">Groupe ${g}</div>
      </div></div>
      <div class="groupe-body">${html}</div>
    </div>`;
  });
}

// ── Scatter + Distributions ───────────────────────────────
function renderScatter(stats) {
  const gColors = {
    "A": "#ef4444", "B": "#f97316", "C": "#eab308", "D": "#22c55e",
    "E": "#14b8a6", "F": "#3b82f6", "G": "#8b5cf6", "H": "#ec4899",
    "I": "#f0c040", "J": "#4ade80", "K": "#38bdf8", "L": "#fb923c"
  };
  const byG = {};
  stats.forEach(s => { if (!byG[s.groupe]) byG[s.groupe] = []; byG[s.groupe].push(s); });
  const datasets = Object.entries(byG).map(([g, pts]) => ({
    label: "Groupe " + g, backgroundColor: gColors[g] || "#888", pointRadius: 7, pointHoverRadius: 10,
    data: pts.map(s => ({ x: s.taux_V, y: s.PTS, label: s.equipe }))
  }));

  const ctxSc = document.getElementById("chartScatter");
  if (ctxSc) {
    new Chart(ctxSc.getContext("2d"), {
      type: "scatter", data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#7a90a8", boxWidth: 8, font: { size: 10 }, padding: 8 },
            position: "bottom"
          },
          tooltip: { callbacks: { label: c => `${c.raw.label} — ${c.raw.x}% / ${c.raw.y} pts` } }
        },
        scales: {
          x: {
            title: { display: true, text: "Taux de victoire (%)", color: "#7a90a8", font: { size: 11 } },
            grid: { color: "rgba(255,255,255,.04)" },
            ticks: { color: "#7a90a8", callback: v => v + "%", font: { size: 10 } }
          },
          y: {
            title: { display: true, text: "Points historiques", color: "#7a90a8", font: { size: 11 } },
            grid: { color: "rgba(255,255,255,.04)" },
            ticks: { color: "#7a90a8", font: { size: 10 } }
          }
        }
      }
    });
  }

  const sPJ = [...stats].sort((a, b) => b.PJ - a.PJ).slice(0, 15);
  const ctxPJ = document.getElementById("chartPJ");
  if (ctxPJ) {
    new Chart(ctxPJ.getContext("2d"), {
      type: "bar",
      data: { labels: sPJ.map(s => s.equipe.split(" ")[0]), datasets: [{ data: sPJ.map(s => s.PJ), backgroundColor: "#185fa5", borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#7a90a8", font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  const sBF = [...stats].sort((a, b) => b.BF - a.BF).slice(0, 15);
  const ctxBF = document.getElementById("chartBF");
  if (ctxBF) {
    new Chart(ctxBF.getContext("2d"), {
      type: "bar",
      data: { labels: sBF.map(s => s.equipe.split(" ")[0]), datasets: [{ data: sBF.map(s => s.BF), backgroundColor: "#22c55e", borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#7a90a8", font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  const t12 = [...stats].filter(s => s.PJ > 0).sort((a, b) => b.PTS - a.PTS).slice(0, 12);
  const ctxButs = document.getElementById("chartButs");
  if (ctxButs) {
    new Chart(ctxButs.getContext("2d"), {
      type: "bar",
      data: {
        labels: t12.map(s => s.equipe.split(" ")[0]),
        datasets: [
          { label: "Buts pour", data: t12.map(s => s.BF), backgroundColor: "rgba(240,192,64,.8)", borderRadius: 3 },
          { label: "Buts contre", data: t12.map(s => s.BC), backgroundColor: "rgba(239,68,68,.6)", borderRadius: 3 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#7a90a8", boxWidth: 10, font: { size: 10 }, padding: 8 },
            position: "bottom"
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#7a90a8", font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }
}
