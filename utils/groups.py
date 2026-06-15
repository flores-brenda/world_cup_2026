# ══════════════════════════════════════════════════════════
# SECTION 2 — COUPE DU MONDE FIFA 2026
# Analyse historique & groupes officiels
# ══════════════════════════════════════════════════════════

# ── 2.1 DÉFINITION DES GROUPES OFFICIELS FIFA 2026 ────────
# Source : Tirage au sort FIFA — 5 décembre 2025, Washington D.C.
# Format inédit : 48 équipes / 12 groupes / 104 matchs
# Tournoi : 11 juin → 19 juillet 2026 (USA, Canada, Mexique)

import pandas as pd

# On charge les résultats nettoyés depuis le CSV généré par clean.py
try:
    results_clean = pd.read_csv("data_clean/results_clean.csv")
    results_clean["date"] = pd.to_datetime(results_clean["date"])
except FileNotFoundError:
    print("Erreur : data_clean/results_clean.csv introuvable. Exécutez clean.py d'abord.")
    raise
groupes_2026 = {
    "A": ["Mexico", "South Africa", "South Korea", "Czechia"],
    "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["United States", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Iraq", "Norway"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}

# Liste à plat de toutes les équipes qualifiées
equipes_2026 = [equipe for groupe in groupes_2026.values() for equipe in groupe]

print("=" * 55)
print("  GROUPES FIFA WORLD CUP 2026")
print("=" * 55)
for groupe, equipes in groupes_2026.items():
    print(f"  Groupe {groupe} : {' | '.join(equipes)}")
print(f"\n  Total équipes : {len(equipes_2026)}")

# ── 2.2 FILTRER L'HISTORIQUE FIFA WORLD CUP ───────────────
# Isoler uniquement les matchs de Coupe du Monde depuis 1930
wc_results = results_clean[
    results_clean["tournament"] == "FIFA World Cup"
].copy()

print(f"\n  Matchs FIFA World Cup dans le dataset : {len(wc_results):,}")
print(f"  Période couverte : {wc_results['date'].dt.year.min()} → {wc_results['date'].dt.year.max()}")
print(f"\n  Éditions disponibles :")
print(wc_results["date"].dt.year.value_counts().sort_index().to_string())

