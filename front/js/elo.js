// ══════════════════════════════════════════════════════════
// ELO RATING ENGINE — FIFA World Cup 2026 Dashboard
// ══════════════════════════════════════════════════════════
// Calcule un Elo itératif pour chaque équipe à partir des
// matchs RAW_H2H depuis 1990 (ère du football moderne).
// Les résultats sont exposés via des globales :
//   window.ELO_RATINGS   → { [equipe]: number }
//   window.ELO_GLOBAL_AVG → number (buts/équipe/match depuis 1990)

const ELO_YEAR_MIN    = 1990;
const ELO_START       = 1500;  // Elo initial par défaut
const ELO_DEBUTANT    = 1200;  // Jamais joué en Coupe du Monde
const ELO_VETERAN_ND  = 1350;  // Historique CM, mais peu de données RAW_H2H

// K-facteurs par type de compétition
// Plus le match est important, plus le Elo change vite
function eloKFactor(tournament) {
  if (!tournament) return 20;
  const t = tournament.toLowerCase();
  if (t.includes('fifa world cup') && !t.includes('qualif')) return 60;
  if (t.includes('world cup qualif') || t.includes('qualification'))  return 30;
  if (t.includes('copa america') || t.includes('african cup') ||
      t.includes('euro') || t.includes('nations cup'))                return 40;
  if (t.includes('confederations') || t.includes('olympic'))          return 35;
  if (t.includes('friendly'))                                          return 20;
  return 25; // Autres tournois régionaux
}

// Probabilité de victoire attendue pour A contre B
function eloExpected(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

// Résultat effectif (1=victoire, 0.5=nul, 0=défaite)
function eloResult(scoreA, scoreB) {
  if (scoreA > scoreB) return 1;
  if (scoreA < scoreB) return 0;
  return 0.5;
}

/**
 * Construit les Elo ratings de manière itérative sur RAW_H2H >= 1990.
 * @param {Array}  stats  — tableau RAW_STATS (pour identifier débutants)
 * @returns {{ ratings: Object, globalAvg: number }}
 */
function buildEloRatings(stats) {
  // Map des équipes CM pour identifier débutants
  const statsMap = {};
  stats.forEach(s => statsMap[s.equipe] = s);

  const ratings = {};
  const getElo  = (team) => {
    if (!(team in ratings)) ratings[team] = ELO_START;
    return ratings[team];
  };

  // Filtrer & trier chronologiquement
  const matches = RAW_H2H
    .filter(m => parseInt(m.date.substring(0, 4)) >= ELO_YEAR_MIN)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calcul des buts pour la moyenne globale (Poisson xG)
  let totalGoals = 0, totalMatchCount = 0;

  matches.forEach(m => {
    const goalsH = +(m.home_score ?? 0);
    const goalsA = +(m.away_score ?? 0);
    totalGoals     += goalsH + goalsA;
    totalMatchCount++;

    const rA = getElo(m.home_team);
    const rB = getElo(m.away_team);
    const K  = eloKFactor(m.tournament);
    const eA = eloExpected(rA, rB);
    const eB = 1 - eA;
    const sA = eloResult(goalsH, goalsA);
    const sB = 1 - sA;

    ratings[m.home_team] = rA + K * (sA - eA);
    ratings[m.away_team] = rB + K * (sB - eB);
  });

  // Elo de fallback pour les équipes de notre tournoi sans données
  const allTeams = Object.values(GROUPES).flat();
  allTeams.forEach(equipe => {
    if (!(equipe in ratings)) {
      const cmStats = statsMap[equipe];
      ratings[equipe] = (cmStats && cmStats.PJ === 0)
        ? ELO_DEBUTANT    // 1ère Coupe du Monde
        : ELO_VETERAN_ND; // A joué mais pas indexé depuis 1990
    }
  });

  const globalAvg = totalMatchCount > 0
    ? totalGoals / (totalMatchCount * 2)
    : 1.3;

  return { ratings, globalAvg };
}

/**
 * Convertit la différence Elo en xG (buts attendus) pour chaque équipe.
 * Formule : xgA = avg * sqrt(odds) avec odds = eA / eB
 * → préserve l'équilibre (xgA * xgB ≈ avg²) tout en reflétant la force relative.
 */
function eloToXG(eloA, eloB, globalAvg) {
  const eA   = eloExpected(eloA, eloB);
  const eB   = 1 - eA;
  const odds = eA / Math.max(eB, 0.001);
  return {
    xgA:   globalAvg * Math.sqrt(odds),
    xgB:   globalAvg / Math.sqrt(odds),
    probA: eA,
    probB: eB,
    probD: 0  // calculé séparément si nécessaire
  };
}

/**
 * Probabilités win/draw/loss via simulation Monte Carlo rapide (1000 itérations).
 * Utile pour l'affichage H2H.
 */
function eloProbabilities(eloA, eloB, globalAvg, iterations = 2000) {
  let wA = 0, wB = 0, d = 0;
  for (let i = 0; i < iterations; i++) {
    const { xgA, xgB } = eloToXG(eloA, eloB, globalAvg);
    const gA = simPoissonGoals(xgA);
    const gB = simPoissonGoals(xgB);
    if (gA > gB) wA++;
    else if (gA < gB) wB++;
    else d++;
  }
  return {
    probA: (wA / iterations * 100).toFixed(1),
    probD: (d  / iterations * 100).toFixed(1),
    probB: (wB / iterations * 100).toFixed(1),
  };
}

// Générateur Poisson partagé (utilisé par simulateur et eloProbabilities)
function simPoissonGoals(lambda) {
  const safeL = Math.max(lambda, 0.01);
  let L = Math.exp(-safeL), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

/**
 * Muestrea un marcador (goalsA, goalsB) desde la distribución conjunta
 * de Poisson corregida con Dixon-Coles (hasta 7 goles por equipo).
 * Más preciso que dos Poisson independientes: genera empates con
 * mayor fidelidad estadística.
 * @returns {[number, number]}
 */
function simDixonColesGoals(xgA, xgB) {
  const MAX_G = 7;
  const rho   = typeof DIXON_COLES_RHO !== 'undefined' ? DIXON_COLES_RHO : -0.13;

  // Función auxiliar tau (duplicada para evitar dependencia circular)
  function tau(i, j) {
    if      (i === 0 && j === 0) return 1 - xgA * xgB * rho;
    else if (i === 0 && j === 1) return 1 + xgA * rho;
    else if (i === 1 && j === 0) return 1 + xgB * rho;
    else if (i === 1 && j === 1) return 1 - rho;
    return 1;
  }

  function poissonProb(k, lam) {
    return (Math.pow(Math.E, -lam) * Math.pow(lam, k)) /
           (k <= 1 ? 1 : Array.from({length: k}, (_, i) => i + 1).reduce((a, b) => a * b));
  }

  // Construir distribución acumulativa
  const cumProbs = [];
  let cumSum = 0;
  for (let i = 0; i <= MAX_G; i++) {
    for (let j = 0; j <= MAX_G; j++) {
      cumSum += poissonProb(i, xgA) * poissonProb(j, xgB) * tau(i, j);
      cumProbs.push({ i, j, cum: cumSum });
    }
  }

  // Muestrear
  const r = Math.random() * cumSum;
  const hit = cumProbs.find(c => c.cum >= r) || cumProbs[cumProbs.length - 1];
  return [hit.i, hit.j];
}

// Couleur Elo pour affichage
function eloColor(elo) {
  if (elo >= 1800) return '#f0c040'; // Or — élite
  if (elo >= 1650) return '#4ade80'; // Vert — très fort
  if (elo >= 1500) return '#4a9eff'; // Bleu — compétitif
  if (elo >= 1350) return '#f97316'; // Orange — moyen
  return '#f87171';                   // Rouge — faible / débutant
}

// Label catégorie Elo
function eloLabel(elo) {
  if (elo >= 1800) return 'Élite mondiale';
  if (elo >= 1650) return 'Très fort';
  if (elo >= 1500) return 'Compétitif';
  if (elo >= 1350) return 'Intermédiaire';
  return 'Débutant / Faible';
}

// Historial real de definiciones por penales (tasa de éxito)
window.SHOOTOUT_STATS = {
  "Algeria": { "played": 15, "won": 7, "rate": 0.467 },
  "Argentina": { "played": 23, "won": 15, "rate": 0.652 },
  "Australia": { "played": 8, "won": 5, "rate": 0.625 },
  "Austria": { "played": 2, "won": 0, "rate": 0.0 },
  "Belgium": { "played": 2, "won": 2, "rate": 1.0 },
  "Bosnia and Herzegovina": { "played": 4, "won": 3, "rate": 0.75 },
  "Brazil": { "played": 16, "won": 9, "rate": 0.562 },
  "Canada": { "played": 8, "won": 3, "rate": 0.375 },
  "Cape Verde": { "played": 5, "won": 2, "rate": 0.4 },
  "Colombia": { "played": 12, "won": 7, "rate": 0.583 },
  "Croatia": { "played": 11, "won": 7, "rate": 0.636 },
  "Curacao": { "played": 2, "won": 0, "rate": 0.0 },
  "Czechia": { "played": 4, "won": 3, "rate": 0.75 },
  "DR Congo": { "played": 8, "won": 5, "rate": 0.625 },
  "Ecuador": { "played": 4, "won": 2, "rate": 0.5 },
  "Egypt": { "played": 26, "won": 15, "rate": 0.577 },
  "England": { "played": 12, "won": 4, "rate": 0.333 },
  "France": { "played": 11, "won": 5, "rate": 0.455 },
  "Germany": { "played": 8, "won": 6, "rate": 0.75 },
  "Ghana": { "played": 13, "won": 5, "rate": 0.385 },
  "Haiti": { "played": 2, "won": 1, "rate": 0.5 },
  "Iran": { "played": 23, "won": 10, "rate": 0.435 },
  "Iraq": { "played": 15, "won": 11, "rate": 0.733 },
  "Ivory Coast": { "played": 18, "won": 10, "rate": 0.556 },
  "Japan": { "played": 12, "won": 5, "rate": 0.417 },
  "Jordan": { "played": 3, "won": 0, "rate": 0.0 },
  "Mexico": { "played": 14, "won": 7, "rate": 0.5 },
  "Morocco": { "played": 14, "won": 6, "rate": 0.429 },
  "Netherlands": { "played": 10, "won": 2, "rate": 0.2 },
  "New Zealand": { "played": 4, "won": 1, "rate": 0.25 },
  "Norway": { "played": 0, "won": 0, "rate": 0.5 },
  "Panama": { "played": 7, "won": 5, "rate": 0.714 },
  "Paraguay": { "played": 13, "won": 6, "rate": 0.462 },
  "Portugal": { "played": 8, "won": 5, "rate": 0.625 },
  "Qatar": { "played": 9, "won": 5, "rate": 0.556 },
  "Saudi Arabia": { "played": 9, "won": 7, "rate": 0.778 },
  "Scotland": { "played": 2, "won": 2, "rate": 1.0 },
  "Senegal": { "played": 21, "won": 11, "rate": 0.524 },
  "South Africa": { "played": 28, "won": 13, "rate": 0.464 },
  "South Korea": { "played": 25, "won": 15, "rate": 0.6 },
  "Spain": { "played": 14, "won": 7, "rate": 0.5 },
  "Sweden": { "played": 6, "won": 4, "rate": 0.667 },
  "Switzerland": { "played": 8, "won": 2, "rate": 0.25 },
  "Tunisia": { "played": 13, "won": 7, "rate": 0.538 },
  "Turkey": { "played": 1, "won": 1, "rate": 1.0 },
  "United States": { "played": 10, "won": 6, "rate": 0.6 },
  "Uruguay": { "played": 17, "won": 9, "rate": 0.529 },
  "Uzbekistan": { "played": 5, "won": 2, "rate": 0.4 }
};

/**
 * Simula un partido de eliminación directa (knockout) de principio a fin.
 * 1. 90 minutos reglamentarios (Dixon-Coles).
 * 2. Si empatan, 30 minutos de tiempo extra (goles ponderados a 1/3 de xG).
 * 3. Si siguen empatados, tanda de penales utilizando el historial real (window.SHOOTOUT_STATS) y Elo.
 */
function simKnockoutMatch(teamA, teamB, ratings, globalAvg) {
  const eloA = ratings[teamA] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
  const eloB = ratings[teamB] || (typeof ELO_DEBUTANT !== 'undefined' ? ELO_DEBUTANT : 1200);
  
  if (typeof eloToXG === 'function' && typeof simDixonColesGoals === 'function') {
    const { xgA, xgB } = eloToXG(eloA, eloB, globalAvg);
    
    // 1. Simulación 90 minutos reglamentarios
    let [gA, gB] = simDixonColesGoals(xgA, xgB);
    if (gA !== gB) return gA > gB ? teamA : teamB;
    
    // 2. Simulación Tiempo Extra (ET - 30 minutos, goles reducidos a 1/3)
    const [etGA, etGB] = simDixonColesGoals(xgA / 3, xgB / 3);
    if (etGA !== etGB) return etGA > etGB ? teamA : teamB;
  } else {
    // Fallback ELO básico si no están disponibles las funciones
    const probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    if (Math.random() < probA) return teamA;
    return teamB;
  }
  
  // 3. Simulación Tanda de Penaltis (SO)
  const statsA = window.SHOOTOUT_STATS && window.SHOOTOUT_STATS[teamA];
  const statsB = window.SHOOTOUT_STATS && window.SHOOTOUT_STATS[teamB];
  
  let probPenA = 0.5;
  
  if (statsA && statsB && (statsA.played > 0 || statsB.played > 0)) {
    // Ponderación: 60% historial real de penales, 40% fuerza general (ELO)
    const eloWinProb = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const rateA = statsA.played > 0 ? statsA.rate : 0.5;
    const rateB = statsB.played > 0 ? statsB.rate : 0.5;
    
    const shootoutProbA = rateA / (rateA + rateB || 1.0);
    probPenA = 0.6 * shootoutProbA + 0.4 * eloWinProb;
  } else {
    // Fallback si no hay historial: ELO con menor sensibilidad que en 90'
    probPenA = 0.5 + 0.1 * ((eloA - eloB) / Math.max(eloA, eloB || 1.0));
  }
  
  // Limitar rango entre 25% y 75% para que siempre haya factor sorpresa
  const finalProbPenA = Math.max(0.25, Math.min(0.75, probPenA));
  return Math.random() < finalProbPenA ? teamA : teamB;
}
