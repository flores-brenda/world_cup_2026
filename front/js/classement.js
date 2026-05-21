// ── Header stats ──────────────────────────────────────────
function renderHeaderStats(stats) {
  const el = document.getElementById("headerStats");
  const items = [
    { val: "48", key: "stat_teams" },
    { val: "12", key: "stat_groups" },
    { val: stats.reduce((a, b) => a + b.BF, 0).toLocaleString(), key: "stat_goals" },
    { val: stats.filter(s => s.titres > 0).length, key: "stat_champions" },
    { val: stats.filter(s => s.PJ === 0).length, key: "stat_debutants" },
  ];
  el.innerHTML = "";
  items.forEach(i => {
    el.innerHTML += `<div class="hstat"><div class="hstat-val">${i.val}</div><div class="hstat-label" data-i18n="${i.key}"></div></div>`;
  });
}

// ── Classement ────────────────────────────────────────────
function renderClassement(stats) {
  const top10 = stats.slice(0, 10);
  const ctx1 = document.getElementById("chartPoints").getContext("2d");
  const g1 = ctx1.createLinearGradient(0, 0, 500, 0);
  g1.addColorStop(0, "#f0c040"); g1.addColorStop(1, "#185fa5");
  new Chart(ctx1, {
    type: "bar", data: {
      labels: [...top10.map(s => s.equipe)].reverse(),
      datasets: [{ data: [...top10.map(s => s.PTS)].reverse(), backgroundColor: g1, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => " " + c.raw + " pts" } } },
      scales: { x: { grid: { color: "rgba(255,255,255,.04)" } }, y: { grid: { display: false }, ticks: { color: "#e8eef6", font: { weight: "600" } } } }
    }
  });

  const ctx2 = document.getElementById("chartTaux").getContext("2d");
  const colors = [...top10.map(s => s.taux_V)].reverse().map((_, i) => i === 9 ? "#f0c040" : i >= 7 ? "#185fa5" : "#4a9eff");
  new Chart(ctx2, {
    type: "bar", data: {
      labels: [...top10.map(s => s.equipe)].reverse(),
      datasets: [{ data: [...top10.map(s => s.taux_V)].reverse(), backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => " " + c.raw + "%" } } },
      scales: { x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { callback: v => v + "%" }, max: 80 }, y: { grid: { display: false }, ticks: { color: "#e8eef6", font: { weight: "600" } } } }
    }
  });

  const table = document.getElementById("rankTable");
  if (!table) return;
  const maxPts = stats[0]?.PTS || 1;
  // Ajouter un wrapper scrollable autour du tableau
  let scrollWrapper = table.closest('.table-scroll');
  if (!scrollWrapper) {
    scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'table-scroll';
    table.parentNode.insertBefore(scrollWrapper, table);
    scrollWrapper.appendChild(table);
  }
  table.innerHTML = `<thead><tr><th>#</th><th>Équipe</th><th class="r">PJ</th><th class="r">V</th><th class="r">N</th><th class="r">D</th>
    <th class="r">BF</th><th class="r">BC</th><th class="r">DB</th><th class="r">PTS</th><th class="r">%V</th><th class="r">🏆</th></tr></thead><tbody>`;
  stats.forEach((s, i) => {
    const bw = Math.round(s.PTS / maxPts * 80);
    const dbColor = s.DB > 0 ? "#22c55e" : s.DB < 0 ? "#ef4444" : "#7a90a8";
    const dbVal = s.DB > 0 ? "+" + s.DB : s.DB;
    table.innerHTML += `<tr>
      <td><span class="rank-num">${i + 1}</span></td>
      <td><span class="bar-mini" style="width:${bw}px"></span>
          <span style="font-weight:600">${s.equipe}</span>
          <span class="badge-group">${s.groupe}</span></td>
      <td class="r">${s.PJ}</td><td class="r">${s.V}</td><td class="r">${s.N}</td><td class="r">${s.D}</td>
      <td class="r">${s.BF}</td><td class="r">${s.BC}</td>
      <td class="r" style="color:${dbColor}">${dbVal}</td>
      <td class="r" style="font-weight:700;color:${s.PTS > 0 ? "#f0c040" : "#7a90a8"}">${s.PTS}</td>
      <td class="r">${s.taux_V}%</td>
      <td class="r">${s.titres > 0 ? "🏆".repeat(s.titres) : "—"}</td></tr>`;
  });
  table.innerHTML += "</tbody>";
}
