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
