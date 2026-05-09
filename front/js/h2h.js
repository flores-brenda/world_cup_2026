// ── Face à Face ───────────────────────────────────────────
let h2hChart = null;

function renderH2H(stats) {
  const selectA = document.getElementById("h2h-teamA-select");
  const selectB = document.getElementById("h2h-teamB-select");
  if (!selectA || !selectB) return;

  const teams = stats.map(s => s.equipe).sort();
  teams.forEach(t => {
    selectA.innerHTML += `<option value="${t}">${t}</option>`;
    selectB.innerHTML += `<option value="${t}">${t}</option>`;
  });
  if (teams.includes("Mexico"))        selectA.value = "Mexico";
  if (teams.includes("United States")) selectB.value = "United States";

  const updateH2H = () => {
    const tA = selectA.value;
    const tB = selectB.value;
    if (tA === tB) return;

    const matches = RAW_H2H
      .filter(m =>
        (m.home_team === tA && m.away_team === tB) ||
        (m.home_team === tB && m.away_team === tA)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    document.getElementById("h2h-results").style.display = "grid";
    document.getElementById("h2h-total").textContent = matches.length;

    let winsA = 0, winsB = 0, draws = 0;
    matches.forEach(m => {
      if (m.home_score === m.away_score) draws++;
      else if (m.home_team === tA && m.home_score > m.away_score) winsA++;
      else if (m.away_team === tA && m.away_score > m.home_score) winsA++;
      else winsB++;
    });

    if (h2hChart) h2hChart.destroy();
    const ctx = document.getElementById("chartH2H").getContext("2d");
    h2hChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [`Victoires ${tA}`, "Matchs nuls", `Victoires ${tB}`],
        datasets: [{
          data: [winsA, draws, winsB],
          backgroundColor: ["#4ade80", "#f0c040", "#f87171"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { color: "#e8eef6" } } },
        cutout: "65%"
      }
    });

    // Timeline des 10 derniers matchs
    const timelineCard = document.getElementById("h2h-timeline-card");
    const timeline     = document.getElementById("h2h-timeline");
    if (matches.length > 0 && timelineCard && timeline) {
      timelineCard.style.display = "block";
      timeline.innerHTML = '<div style="position:absolute; top:50%; left:5%; right:5%; height:2px; background:var(--border); z-index:0;"></div>';
      matches.slice(0, 10).forEach(m => {
        let color = "#f0c040";
        if (m.home_score !== m.away_score) {
          const winner = m.home_score > m.away_score ? m.home_team : m.away_team;
          color = winner === tA ? "#4ade80" : "#f87171";
        }
        const date  = m.date.substring(0, 4);
        const score = m.home_team === tA
          ? `${m.home_score} - ${m.away_score}`
          : `${m.away_score} - ${m.home_score}`;
        timeline.innerHTML += `
          <div style="position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; cursor:pointer;"
               title="${m.date} - ${m.tournament}">
            <div style="font-size:10px; color:var(--muted); margin-bottom:6px;">${date}</div>
            <div style="width:16px; height:16px; border-radius:50%; background:${color}; border:3px solid var(--surface);
                        box-shadow:0 0 0 1px ${color}; transition:0.2s;"
                 onmouseover="this.style.transform='scale(1.3)'"
                 onmouseout="this.style.transform='scale(1)'"></div>
            <div style="font-size:12px; font-weight:bold; margin-top:6px; color:white;">${score}</div>
          </div>`;
      });
    } else if (timelineCard) {
      timelineCard.style.display = "none";
    }
  };

  selectA.addEventListener("change", updateH2H);
  selectB.addEventListener("change", updateH2H);
  updateH2H();
}
