// ── Palmarès ──────────────────────────────────────────────
function renderPalmares(stats) {
  const champs = stats.filter(s => s.titres > 0).sort((a, b) => b.titres - a.titres);
  const ctxPal = document.getElementById("chartPalmares");
  if (ctxPal) {
    const ctx = ctxPal.getContext("2d");
    const gP = ctx.createLinearGradient(0, 0, 0, 300);
    gP.addColorStop(0, "#f0c040"); gP.addColorStop(1, "#e8a820");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: champs.map(s => s.equipe),
        datasets: [
          { label: "Titres",  data: champs.map(s => s.titres),  backgroundColor: gP, borderRadius: 6 },
          { label: "Finales", data: champs.map(s => s.finales), backgroundColor: "rgba(74,158,255,.5)", borderRadius: 6 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#e8eef6" } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#e8eef6", font: { weight: "600" } } },
          y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  const container = document.getElementById("palmaresCards");
  if (!container) return;
  stats
    .filter(s => s.titres > 0 || s.finales > 0)
    .sort((a, b) => b.titres - a.titres || b.finales - a.finales)
    .forEach(s => {
      container.innerHTML += `<div class="champion-card">
        <div class="champion-trophies">${s.titres > 0 ? "🏆".repeat(s.titres) : "🥈"}</div>
        <div>
          <div class="champion-name">${s.equipe}</div>
          <div class="champion-meta"><strong>${s.titres}</strong> titre${s.titres > 1 ? "s" : ""} ·
            <strong>${s.finales}</strong> finale${s.finales > 1 ? "s" : ""}
            ${s.annees !== "—" ? ` · <span style="color:#f0c040">${s.annees}</span>` : ""}</div>
          <div class="champion-group">Groupe ${s.groupe} · ${s.PTS} pts · ${s.taux_V}% victoires</div>
        </div>
      </div>`;
    });
}
