# ══════════════════════════════════════════════════════════
# 2.3 PERFORMANCE HISTORIQUE PAR ÉQUIPE — FIFA WORLD CUP
# Base pour le classement et l'analyse par groupe
# ══════════════════════════════════════════════════════════

import os
os.makedirs("outputs/graphs", exist_ok=True)

# ── Calcul des statistiques pour chaque équipe ────────────
# On analyse chaque équipe sous ses deux rôles : domicile et extérieur
# puis on agrège pour obtenir les stats globales en Coupe du Monde

stats_liste = []

for equipe in equipes_2026:

    # Matchs où l'équipe jouait à domicile
    dom = wc_results[wc_results["home_team"] == equipe]
    # Matchs où l'équipe jouait à l'extérieur
    ext = wc_results[wc_results["away_team"] == equipe]

    # Calcul des victoires, nuls, défaites
    v_dom  = (dom["home_score"] > dom["away_score"]).sum()
    n_dom  = (dom["home_score"] == dom["away_score"]).sum()
    d_dom  = (dom["home_score"] < dom["away_score"]).sum()

    v_ext  = (ext["away_score"] > ext["home_score"]).sum()
    n_ext  = (ext["away_score"] == ext["home_score"]).sum()
    d_ext  = (ext["away_score"] < ext["home_score"]).sum()

    # Agrégation
    pj = len(dom) + len(ext)   # Parties jouées
    v  = v_dom + v_ext         # Victoires
    n  = n_dom + n_ext         # Nuls
    d  = d_dom + d_ext         # Défaites

    # Buts
    bf = dom["home_score"].sum() + ext["away_score"].sum()   # Buts pour
    bc = dom["away_score"].sum() + ext["home_score"].sum()   # Buts contre
    db = bf - bc                                              # Différence de buts

    # Points FIFA (3 par victoire, 1 par nul)
    pts = v * 3 + n

    # Taux de victoire
    taux_v = round(v / pj * 100, 1) if pj > 0 else 0

    stats_liste.append({
        "equipe":   equipe,
        "PJ":       pj,
        "V":        v,
        "N":        n,
        "D":        d,
        "BF":       int(bf),
        "BC":       int(bc),
        "DB":       int(db),
        "PTS":      pts,
        "taux_V":   taux_v,
    })

# Créer le DataFrame de statistiques
stats_wc = pd.DataFrame(stats_liste).sort_values("PTS", ascending=False).reset_index(drop=True)
stats_wc.index += 1   # Classement à partir de 1

# ── Affichage du classement historique ────────────────────
print("=" * 75)
print("  CLASSEMENT HISTORIQUE EN COUPE DU MONDE — Équipes qualifiées 2026")
print("=" * 75)
print(f"  {'#':<4} {'Équipe':<25} {'PJ':>4} {'V':>4} {'N':>4} {'D':>4} "
      f"{'BF':>5} {'BC':>5} {'DB':>5} {'PTS':>5} {'%V':>6}")
print("  " + "-" * 71)
for idx, row in stats_wc.iterrows():
    print(f"  {idx:<4} {row['equipe']:<25} {row['PJ']:>4} {row['V']:>4} "
          f"{row['N']:>4} {row['D']:>4} {row['BF']:>5} {row['BC']:>5} "
          f"{row['DB']:>5} {row['PTS']:>5} {row['taux_V']:>5.1f}%")

# ── Visualisation — Top 10 équipes par points historiques ─
top10 = stats_wc.head(10)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle("Performance historique en Coupe du Monde\nÉquipes qualifiées 2026",
             fontsize=14, fontweight="bold")

# Graphique 1 — Points historiques top 10
couleurs_bar = ["#042C53" if i == 0 else "#185FA5" if i < 3 else "#85B7EB"
                for i in range(len(top10))]
barres = axes[0].barh(top10["equipe"][::-1], top10["PTS"][::-1], color=couleurs_bar[::-1])
axes[0].set_title("Top 10 — Points historiques (V×3 + N×1)", fontweight="bold")
axes[0].set_xlabel("Points")
for barre, val in zip(barres, top10["PTS"][::-1]):
    axes[0].text(barre.get_width() + 1, barre.get_y() + barre.get_height()/2,
                 str(val), va="center", fontsize=9, fontweight="bold")

# Graphique 2 — Taux de victoire top 10
axes[1].barh(top10["equipe"][::-1], top10["taux_V"][::-1], color="#378ADD")
axes[1].set_title("Top 10 — Taux de victoire (%)", fontweight="bold")
axes[1].set_xlabel("Taux de victoire (%)")
axes[1].axvline(x=50, color="#EF9F27", linestyle="--", alpha=0.8, label="50% référence")
axes[1].legend()
for i, (barre, val) in enumerate(zip(axes[1].patches, top10["taux_V"][::-1])):
    axes[1].text(barre.get_width() + 0.3, barre.get_y() + barre.get_height()/2,
                 f"{val}%", va="center", fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig("outputs/graphs/classement_historique_wc.png", dpi=150, bbox_inches="tight")
# plt.show()
print("\n✅ Graphique sauvegardé : outputs/graphs/classement_historique_wc.png")



# ── SAUVEGARDE DU CLASSEMENT HISTORIQUE EN CSV ────────────
# Permet de visualiser et partager facilement le classement
stats_wc.to_csv("data_clean/classement_historique_wc.csv", index=True)
print("✅ Classement sauvegardé : data_clean/classement_historique_wc.csv")
