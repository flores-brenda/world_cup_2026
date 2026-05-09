# ══════════════════════════════════════════════════════════
# 2.5 PALMARÈS — TITRES ET FINALES EN COUPE DU MONDE
# Enrichissement du classement avec les titres historiques
# ══════════════════════════════════════════════════════════

# Palmarès manuel — titres officiels FIFA World Cup
# Source : FIFA (données non présentes dans le dataset)
palmares = {
    "Brazil":        {"titres": 5, "finales": 7,  "annees": "1958,1962,1970,1994,2002"},
    "Germany":       {"titres": 4, "finales": 8,  "annees": "1954,1974,1990,2014"},
    "Argentina":     {"titres": 3, "finales": 5,  "annees": "1978,1986,2022"},
    "France":        {"titres": 2, "finales": 3,  "annees": "1998,2018"},
    "Uruguay":       {"titres": 2, "finales": 2,  "annees": "1930,1950"},
    "England":       {"titres": 1, "finales": 1,  "annees": "1966"},
    "Spain":         {"titres": 1, "finales": 1,  "annees": "2010"},
    "Netherlands":   {"titres": 0, "finales": 3,  "annees": "—"},
    "Portugal":      {"titres": 0, "finales": 0,  "annees": "—"},
    "Belgium":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Mexico":        {"titres": 0, "finales": 0,  "annees": "—"},
    "Croatia":       {"titres": 0, "finales": 1,  "annees": "—"},
    "Colombia":      {"titres": 0, "finales": 0,  "annees": "—"},
    "Switzerland":   {"titres": 0, "finales": 0,  "annees": "—"},
    "Japan":         {"titres": 0, "finales": 0,  "annees": "—"},
    "South Korea":   {"titres": 0, "finales": 0,  "annees": "—"},
    "Morocco":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Senegal":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Ecuador":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Turkey":        {"titres": 0, "finales": 0,  "annees": "—"},
    "Australia":     {"titres": 0, "finales": 0,  "annees": "—"},
    "Iran":          {"titres": 0, "finales": 0,  "annees": "—"},
    "Ghana":         {"titres": 0, "finales": 0,  "annees": "—"},
    "Paraguay":      {"titres": 0, "finales": 0,  "annees": "—"},
    "Algeria":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Austria":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Norway":        {"titres": 0, "finales": 0,  "annees": "—"},
    "Scotland":      {"titres": 0, "finales": 0,  "annees": "—"},
    "Saudi Arabia":  {"titres": 0, "finales": 0,  "annees": "—"},
    "Tunisia":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Ukraine":       {"titres": 0, "finales": 0,  "annees": "—"},
    "South Africa":  {"titres": 0, "finales": 0,  "annees": "—"},
    "United States": {"titres": 0, "finales": 0,  "annees": "—"},
    "Egypt":         {"titres": 0, "finales": 0,  "annees": "—"},
    "New Zealand":   {"titres": 0, "finales": 0,  "annees": "—"},
    "Bosnia and Herzegovina": {"titres": 0, "finales": 0, "annees": "—"},
    "Canada":        {"titres": 0, "finales": 0,  "annees": "—"},
    "Qatar":         {"titres": 0, "finales": 0,  "annees": "—"},
    "Haiti":         {"titres": 0, "finales": 0,  "annees": "—"},
    "Curacao":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Cape Verde":    {"titres": 0, "finales": 0,  "annees": "—"},
    "Iraq":          {"titres": 0, "finales": 0,  "annees": "—"},
    "Jordan":        {"titres": 0, "finales": 0,  "annees": "—"},
    "DR Congo":      {"titres": 0, "finales": 0,  "annees": "—"},
    "Uzbekistan":    {"titres": 0, "finales": 0,  "annees": "—"},
    "Panama":        {"titres": 0, "finales": 0,  "annees": "—"},
    "Czechia":       {"titres": 0, "finales": 0,  "annees": "—"},
    "Ivory Coast":   {"titres": 0, "finales": 0,  "annees": "—"},
    "Netherlands":   {"titres": 0, "finales": 3,  "annees": "—"},
}

# Intégrer le palmarès dans stats_wc
stats_wc["titres"]  = stats_wc["equipe"].map(lambda x: palmares.get(x, {}).get("titres", 0))
stats_wc["finales"] = stats_wc["equipe"].map(lambda x: palmares.get(x, {}).get("finales", 0))
stats_wc["annees_titres"] = stats_wc["equipe"].map(lambda x: palmares.get(x, {}).get("annees", "—"))

# ── Affichage enrichi ─────────────────────────────────────
print("=" * 72)
print("  PALMARÈS — ÉQUIPES QUALIFIÉES 2026 (titres & finales)")
print("=" * 72)
print(f"\n  {'Équipe':<25} {'Groupe':<8} {'PTS':>5} {'%V':>6} {'🏆':>4} {'Finales':>8}  Années")
print(f"  {'-' * 68}")

for _, row in stats_wc.sort_values("titres", ascending=False).iterrows():
    if row["titres"] > 0 or row["finales"] > 0:
        trophee = "🏆" * int(row["titres"]) if row["titres"] > 0 else "—"
        print(f"  {row['equipe']:<25} {row['groupe']:<8} {row['PTS']:>5} "
              f"{row['taux_V']:>5.1f}% {row['titres']:>4} {row['finales']:>8}  {row['annees_titres']}")

# ── Sauvegarde enrichie ───────────────────────────────────
stats_wc.to_csv("data_clean/classement_historique_wc.csv", index=True)

# ── Visualisation — Champions du monde dans les groupes ───
champions = stats_wc[stats_wc["titres"] > 0].sort_values("titres", ascending=False)

fig, ax = plt.subplots(figsize=(12, 5))
barres = ax.bar(champions["equipe"], champions["titres"],
                color=["#042C53", "#185FA5", "#185FA5", "#378ADD",
                       "#378ADD", "#85B7EB", "#85B7EB", "#85B7EB"],
                edgecolor="white", linewidth=0.5)

# Annoter avec les années
for barre, (_, row) in zip(barres, champions.iterrows()):
    ax.text(barre.get_x() + barre.get_width()/2, barre.get_height() + 0.05,
            f"Groupe {row['groupe']}", ha="center", fontsize=9, color="#042C53", fontweight="bold")
    ax.text(barre.get_x() + barre.get_width()/2, barre.get_height()/2,
            str(int(row["titres"])), ha="center", fontsize=14,
            color="white", fontweight="bold")

ax.set_title("Champions du Monde qualifiés pour 2026\nNombre de titres FIFA World Cup",
             fontweight="bold", fontsize=13)
ax.set_ylabel("Nombre de titres")
ax.set_ylim(0, 6.5)
ax.tick_params(axis="x", rotation=15)

plt.tight_layout()
plt.savefig("outputs/graphs/palmares_champions_2026.png", dpi=150, bbox_inches="tight")
# plt.show()
print("\n✅ Fichiers sauvegardés :")
print("   📄 data_clean/classement_historique_wc.csv  (enrichi avec palmarès)")
print("   🖼️  outputs/graphs/palmares_champions_2026.png")
