// ── Pronostics (Poisson) ──────────────────────────────────
let poissonChart = null;

function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }
function poisson(k, lambda) { return (Math.pow(Math.E, -lambda) * Math.pow(lambda, k)) / fact(k); }

function renderPronostics(stats) {
  const selectA = document.getElementById("teamA-select");
  const selectB = document.getElementById("teamB-select");
  if (!selectA || !selectB) return;

  const teams = stats.map(s => s.equipe).sort();
  teams.forEach(t => {
    selectA.innerHTML += `<option value="${t}">${t}</option>`;
    selectB.innerHTML += `<option value="${t}">${t}</option>`;
  });

  if (teams.includes("France"))    selectA.value = "France";
  if (teams.includes("Argentina")) selectB.value = "Argentina";

  const strMap = {};
  if (PREDICTIONS && PREDICTIONS.strengths) {
    PREDICTIONS.strengths.forEach(s => strMap[s.equipe] = s);

    // Top 5 Favoris : Basé sur le calcul statistique Elo
    let powerList = [];
    if (window.ELO_RATINGS) {
      powerList = teams.map(eq => ({
        equipe: eq,
        power: window.ELO_RATINGS[eq] || 1500
      })).sort((a, b) => b.power - a.power);
    } else {
      powerList = PREDICTIONS.strengths
        .map(s => ({ equipe: s.equipe, power: s.attack_strength / Math.max(s.defense_weakness, 0.1) }))
        .sort((a, b) => b.power - a.power);
    }

    const top5 = powerList.slice(0, 5);
    const top5container = document.getElementById("top5-predictions");
    if (top5container && top5.length > 0) {
      const maxPower = top5[0].power;
      // Baseline to make differences in Elo more visible (e.g. min Elo around 1400)
      const baseline = window.ELO_RATINGS ? 1400 : 0; 
      
      top5.forEach((t, i) => {
        const heightVal = Math.max(0, t.power - baseline);
        const maxVal = Math.max(1, maxPower - baseline);
        const height = Math.max(20, (heightVal / maxVal) * 100);
        
        const color = i === 0 ? "var(--gold)" : (i === 1 ? "#cbd5e1" : (i === 2 ? "#b45309" : "var(--blue-light)"));
        const displayScore = window.ELO_RATINGS ? Math.round(t.power) : t.power.toFixed(1);
        
        top5container.innerHTML += `
          <div style="display:flex; flex-direction:column; align-items:center; width:80px;">
            <div style="font-weight:bold; font-size:16px; color:${color}; margin-bottom:4px;">${displayScore}</div>
            <div style="width:100%; height:${height}px; background:${color}; border-radius:4px 4px 0 0; opacity:0.8; transition:0.3s;"
              onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8"></div>
            <div style="font-size:11px; color:var(--muted); font-weight:bold; text-transform:uppercase; margin-top:8px; padding-bottom:8px; text-align:center;">${t.equipe.substring(0, 10)}</div>
          </div>`;
      });
    }
  }

  const btnSim = document.getElementById("btn-simuler");
  if (!btnSim) return;
  btnSim.onclick = () => {
    const teamA = selectA.value;
    const teamB = selectB.value;
    if (teamA === teamB) { alert("Veuillez sélectionner deux équipes différentes."); return; }

    document.getElementById("prediction-results").style.display = "grid";

    const strA = strMap[teamA] || { attack_strength: 1, defense_weakness: 1 };
    const strB = strMap[teamB] || { attack_strength: 1, defense_weakness: 1 };
    const avg  = PREDICTIONS.global_avg || 1.3;

    const xgA = strA.attack_strength * strB.defense_weakness * avg;
    const xgB = strB.attack_strength * strA.defense_weakness * avg;

    document.getElementById("xg-nameA").textContent = teamA;
    document.getElementById("xg-teamA").textContent = xgA.toFixed(2);
    document.getElementById("xg-nameB").textContent = teamB;
    document.getElementById("xg-teamB").textContent = xgB.toFixed(2);

    let probA = 0, probB = 0, probDraw = 0;
    for (let i = 0; i <= 5; i++) {
      for (let j = 0; j <= 5; j++) {
        const p = poisson(i, xgA) * poisson(j, xgB);
        if (i > j) probA += p;
        else if (i < j) probB += p;
        else probDraw += p;
      }
    }
    const sum = probA + probB + probDraw;
    probA    = (probA    / sum) * 100;
    probB    = (probB    / sum) * 100;
    probDraw = (probDraw / sum) * 100;

    if (poissonChart) poissonChart.destroy();
    const ctx = document.getElementById("chartPoisson").getContext("2d");
    poissonChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [`Victoire ${teamA}`, "Match Nul", `Victoire ${teamB}`],
        datasets: [{
          data: [probA.toFixed(1), probDraw.toFixed(1), probB.toFixed(1)],
          backgroundColor: ["#4ade80", "#f0c040", "#f87171"],
          borderWidth: 0, hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: "#e8eef6", padding: 15 } },
          tooltip: { callbacks: { label: c => ` ${c.raw}%` } }
        },
        cutout: "65%"
      }
    });
  };
}
