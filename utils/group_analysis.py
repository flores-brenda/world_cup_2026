# ══════════════════════════════════════════════════════════
# 2.4 ANALYSE PAR GROUPE — FIFA WORLD CUP 2026
# Croisement du classement historique avec les groupes officiels
# ══════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════
import pandas as pd
import matplotlib.pyplot as plt
from utils.helpers import save_to_clean_data
from utils.groups import groupes_2026

# On charge le classement historique calculé dans performance.py
try:
    stats_wc = pd.read_csv("data_clean/classement_historique_wc.csv")
except FileNotFoundError:
    print("Erreur : classement_historique_wc.csv introuvable. Exécutez performance.py d'abord.")
    raise

# ── Ajouter le groupe de chaque équipe au classement ──────
equipe_groupe = {equipe: groupe
                 for groupe, equipes in groupes_2026.items()
                 for equipe in equipes}

stats_wc["groupe"] = stats_wc["equipe"].map(equipe_groupe)

# ── Analyse détaillée par groupe ──────────────────────────
print("=" * 65)
print("  ANALYSE PAR GROUPE — COUPE DU MONDE 2026")
print("=" * 65)

resultats_groupes = []

for groupe in sorted(groupes_2026.keys()):
    equipes_du_groupe = groupes_2026[groupe]
    stats_groupe = stats_wc[stats_wc["groupe"] == groupe].copy()

    # Trier par points dans le groupe
    stats_groupe = stats_groupe.sort_values("PTS", ascending=False)

    print(f"\n  GROUPE {groupe}")
    print(f"  {'-' * 60}")
    print(f"  {'Équipe':<25} {'PJ':>4} {'V':>4} {'PTS':>5} {'%V':>6} {'DB':>5}")
    print(f"  {'-' * 60}")

    favori = None
    for _, row in stats_groupe.iterrows():
        # Identifier le favori du groupe (le plus de points)
        if favori is None:
            favori = row["equipe"]
            marqueur = " ⭐"
        else:
            marqueur = ""
        print(f"  {row['equipe']:<25} {row['PJ']:>4} {row['V']:>4} "
              f"{row['PTS']:>5} {row['taux_V']:>5.1f}% {row['DB']:>5}{marqueur}")

    # Débutants dans le groupe (0 matchs en Coupe du Monde)
    debutants = stats_groupe[stats_groupe["PJ"] == 0]["equipe"].tolist()
    if debutants:
        print(f"\n  ⚠️  Débutants en Coupe du Monde : {', '.join(debutants)}")

    # Sauvegarder le résumé du groupe
    resultats_groupes.append({
        "groupe":   groupe,
        "favori":   favori,
        "equipes":  " | ".join(equipes_du_groupe),
        "pts_favori": stats_groupe.iloc[0]["PTS"] if len(stats_groupe) > 0 else 0,
        "debutants": ", ".join(debutants) if debutants else "Aucun",
    })

# ── Résumé global des favoris ─────────────────────────────
print("\n\n" + "=" * 65)
print("  RÉSUMÉ — FAVORIS HISTORIQUES PAR GROUPE")
print("=" * 65)
print(f"\n  {'Groupe':<8} {'Favori historique':<25} {'PTS':>5}")
print(f"  {'-' * 40}")
for r in resultats_groupes:
    print(f"  {r['groupe']:<8} {r['favori']:<25} {r['pts_favori']:>5}")

# ── Sauvegarde ────────────────────────────────────────────
df_groupes = pd.DataFrame(resultats_groupes)
save_to_clean_data(df_groupes, "analyse_groupes_2026.csv", index=False)
save_to_clean_data(stats_wc, "classement_historique_wc.csv", index=True)

# ── Visualisation — Favoris par groupe ────────────────────
fig, ax = plt.subplots(figsize=(14, 7))

# Préparer les données : un point par équipe, coloré par groupe
couleurs_groupes = plt.cm.tab20.colors
groupe_labels = sorted(groupes_2026.keys())

for i, groupe in enumerate(groupe_labels):
    stats_g = stats_wc[stats_wc["groupe"] == groupe].sort_values("PTS", ascending=False)
    for j, (_, row) in enumerate(stats_g.iterrows()):
        couleur = couleurs_groupes[i % len(couleurs_groupes)]
        ax.scatter(row["taux_V"], row["PTS"], color=couleur, s=120, zorder=3)
        ax.annotate(f"{row['equipe']}\n(G{groupe})",
                    (row["taux_V"], row["PTS"]),
                    fontsize=7, ha="left", va="bottom",
                    xytext=(3, 3), textcoords="offset points")

ax.axvline(x=50, color="#EF9F27", linestyle="--", alpha=0.6, label="50% taux victoire")
ax.axhline(y=50, color="#85B7EB", linestyle="--", alpha=0.6, label="50 points")
ax.set_title("Performance historique par équipe — Coupe du Monde 2026\n"
             "Taux de victoire vs Points totaux", fontweight="bold", fontsize=13)
ax.set_xlabel("Taux de victoire (%)")
ax.set_ylabel("Points historiques totaux")
ax.legend(fontsize=9)

plt.tight_layout()
plt.savefig("outputs/graphs/analyse_groupes_2026.png", dpi=150, bbox_inches="tight")
# plt.show()
print("\n✅ Fichiers sauvegardés :")
print("   📄 data_clean/analyse_groupes_2026.csv")
print("   📄 data_clean/classement_historique_wc.csv")
print("   🖼️  outputs/graphs/analyse_groupes_2026.png")

