# ══════════════════════════════════════════════════════════
# 2.6 GÉNÉRATION DES 12 VISUELS LINKEDIN — PAR GROUPE
# Une graphique + un texte de post par groupe
# ══════════════════════════════════════════════════════════

import os
os.makedirs("outputs/linkedin", exist_ok=True)

import pandas as pd
import matplotlib.pyplot as plt
from utils.groups import groupes_2026

# On charge le classement historique calculé dans performance.py
try:
    stats_wc = pd.read_csv("data_clean/classement_historique_wc.csv")
except FileNotFoundError:
    print("Erreur : classement_historique_wc.csv introuvable. Exécutez performance.py d'abord.")
    raise

# ── Palette de couleurs par rang dans le groupe ───────────
def couleur_rang(rang, total):
    # Le favori en or, les autres en bleu (Thème Dashboard)
    palette = ["#f0c040", "#4a9eff", "#185fa5", "#2a4365"]
    return palette[min(rang, total - 1)]

# ── Emoji drapeaux approximatifs par équipe ───────────────
drapeaux = {
    "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
    "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
    "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "United States": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
    "Germany": "🇩🇪", "Curacao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
    "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
    "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
    "Spain": "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
    "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
    "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
    "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
}

# ── Génération des visuels et posts ──────────────────────
posts_linkedin = []

for groupe in sorted(groupes_2026.keys()):

    # Données du groupe triées par points
    stats_g = stats_wc[stats_wc["groupe"] == groupe].sort_values("PTS", ascending=False).reset_index(drop=True)
    favori  = stats_g.iloc[0]["equipe"]
    titres_favori = int(stats_g.iloc[0]["titres"])

    # ── Graphique ─────────────────────────────────────────
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Couleurs du thème sombre HTML
    bg_color = "#060d18"
    surface_color = "#0d1b2e"
    text_color = "#e8eef6"
    muted_color = "#7a90a8"
    gold_color = "#f0c040"
    
    fig.patch.set_facecolor(bg_color)

    fig.suptitle(f"⚽ FIFA World Cup 2026 — Groupe {groupe}\nAnalyse historique",
                 fontsize=16, fontweight="bold", color=text_color, y=1.05)

    couleurs = [couleur_rang(i, len(stats_g)) for i in range(len(stats_g))]

    for ax in axes:
        ax.set_facecolor(surface_color)
        ax.tick_params(colors=muted_color, labelsize=10)
        for spine in ax.spines.values():
            spine.set_color("#132238")
            spine.set_linewidth(1)

    # Barres horizontales — Points historiques
    equipes_labels = [f"{drapeaux.get(e, '')} {e}" for e in stats_g["equipe"]]
    barres = axes[0].barh(equipes_labels[::-1], stats_g["PTS"][::-1],
                          color=couleurs[::-1], edgecolor=surface_color, linewidth=1.5)
    axes[0].set_title("Points historiques en Coupe du Monde", fontweight="bold",
                      fontsize=12, color=text_color)
    axes[0].set_xlabel("Points (V×3 + N×1)", color=muted_color)
    
    for barre, val in zip(barres, stats_g["PTS"][::-1]):
        axes[0].text(max(barre.get_width() - 2, 1),
                     barre.get_y() + barre.get_height()/2,
                     str(int(val)), va="center", ha="right",
                     color=bg_color if barre.get_facecolor()[0] > 0.8 else text_color, 
                     fontsize=11, fontweight="bold")

    # Barres horizontales — Taux de victoire
    barres2 = axes[1].barh(equipes_labels[::-1], stats_g["taux_V"][::-1],
                           color=couleurs[::-1], edgecolor=surface_color, linewidth=1.5)
    axes[1].set_title("Taux de victoire (%)", fontweight="bold",
                      fontsize=12, color=text_color)
    axes[1].set_xlabel("Taux de victoire (%)", color=muted_color)
    axes[1].axvline(x=50, color="#ef4444", linestyle="--", alpha=0.7, label="50% référence")
    
    legend = axes[1].legend(fontsize=9, facecolor=surface_color, edgecolor="#132238", labelcolor=muted_color)
    
    for barre, val in zip(barres2, stats_g["taux_V"][::-1]):
        offset = -3 if val > 15 else 2
        txt_color = bg_color if (val > 15 and barre.get_facecolor()[0] > 0.8) else text_color
        axes[1].text(max(barre.get_width() + offset, 1),
                     barre.get_y() + barre.get_height()/2,
                     f"{val:.1f}%", va="center", ha="right" if val > 15 else "left",
                     color=txt_color,
                     fontsize=11, fontweight="bold")

    # Légende des titres dans le coin
    titres_texte = "\n".join([
        f"🏆 {row['equipe']} — {int(row['titres'])} titre(s)"
        for _, row in stats_g.iterrows() if row["titres"] > 0
    ]) or "Aucun champion du monde dans ce groupe"

    fig.text(0.5, -0.05, titres_texte, ha="center", fontsize=11,
             color=gold_color, style="italic")

    plt.tight_layout()
    chemin_graphique = f"outputs/linkedin/groupe_{groupe}.png"
    plt.savefig(chemin_graphique, dpi=200, bbox_inches="tight", facecolor=bg_color)
    plt.close()

    # ── Texte du post LinkedIn ────────────────────────────
    debutants = stats_g[stats_g["PJ"] == 0]["equipe"].tolist()
    debutants_texte = (f"🆕 Débutants : {', '.join([drapeaux.get(d,'') + ' ' + d for d in debutants])}\n"
                       if debutants else "")

    # Construire les lignes d'équipes
    lignes_equipes = ""
    for i, (_, row) in enumerate(stats_g.iterrows()):
        drapeau = drapeaux.get(row["equipe"], "")
        etoile  = " ⭐ Favori historique" if i == 0 else ""
        trophee = f" 🏆×{int(row['titres'])}" if row["titres"] > 0 else ""
        lignes_equipes += (f"{drapeau} {row['equipe']}{trophee}{etoile}\n"
                          f"   📊 {int(row['PJ'])} matchs | {int(row['V'])}V "
                          f"{int(row['N'])}N {int(row['D'])}D | "
                          f"{row['taux_V']:.1f}% victoires | {int(row['DB']):+d} buts\n\n")

    post = f"""⚽ #FIFAWorldCup2026 — Groupe {groupe} 🔍

Qui a le meilleur palmarès historique dans ce groupe ?
Voici ce que disent les données 📊

{lignes_equipes}{debutants_texte}
📌 Analyse basée sur {int(stats_g['PJ'].sum())} matchs de Coupe du Monde (1930–2022)

💡 Le favori historique n'est pas toujours le favori du terrain —
mais les chiffres ne mentent pas.

#Football #DataAnalysis #WorldCup2026 #Groupe{groupe} #DataScience #FIFA
"""

    posts_linkedin.append({
        "groupe":    groupe,
        "favori":    favori,
        "post":      post,
        "graphique": chemin_graphique,
    })

    print(f"✅ Groupe {groupe} — {chemin_graphique}")

# ── Sauvegarder tous les posts dans un fichier texte ─────
with open("outputs/linkedin/posts_linkedin.txt", "w", encoding="utf-8") as f:
    for p in posts_linkedin:
        f.write(f"{'='*60}\n")
        f.write(f"GROUPE {p['groupe']} — Favori : {p['favori']}\n")
        f.write(f"Graphique : {p['graphique']}\n")
        f.write(f"{'='*60}\n")
        f.write(p["post"])
        f.write("\n\n")

print("\n✅ Tous les visuels et posts sont prêts !")
print("   🖼️  outputs/linkedin/groupe_A.png → groupe_L.png")
print("   📄  outputs/linkedin/posts_linkedin.txt")

