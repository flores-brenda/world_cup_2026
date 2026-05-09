"""# Nettoyage

Conversion des dates
"""

for name, df in dfs.items():
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        invalides = df["date"].isnull().sum()
        if invalides:
            print(f"[{name}] ⚠️  {invalides} dates invalides → seront supprimées")
            dfs[name] = df.dropna(subset=["date"])

"""Suppression des doublons"""

for name, df in dfs.items():
    avant = len(df)
    dfs[name] = df.drop_duplicates()
    supprimes = avant - len(dfs[name])
    if supprimes:
        print(f"[{name}] 🗑️  {supprimes} doublons supprimés")

"""Nettoyage des espaces dans les colonnes texte"""

cols_texte = {
    "results":      ["home_team", "away_team", "tournament", "city", "country"],
    "shootouts":    ["home_team", "away_team", "winner", "first_shooter"],
    "goalscorers":  ["home_team", "away_team", "team", "scorer"],
    "former_names": ["current", "former"],
}
for name, cols in cols_texte.items():
    for col in cols:
        if col in dfs[name].columns:
            dfs[name][col] = dfs[name][col].str.strip()

"""Normalisation des colonnes booléennes"""

for col in ["neutral", "own_goal", "penalty"]:
    for name, df in dfs.items():
        if col in df.columns:
            dfs[name][col] = df[col].astype(str).str.strip().str.upper().map(
                {"TRUE": True, "FALSE": False, "1": True, "0": False}
            )

"""Vérification des scores non négatifs"""

neg_domicile = (dfs["results"]["home_score"] < 0).sum()
neg_exterieur = (dfs["results"]["away_score"] < 0).sum()
if neg_domicile or neg_exterieur:
    print(f"[results] ⚠️  Scores négatifs : domicile={neg_domicile}, extérieur={neg_exterieur}")
else:
    print("[results] ✅ Aucun score négatif détecté")

"""Conversion des dates de début/fin dans former_names"""

for col in ["start_date", "end_date"]:
    if col in dfs["former_names"].columns:
        dfs["former_names"][col] = pd.to_datetime(
            dfs["former_names"][col], errors="coerce"
        )

"""**RÉAFFECTATION DES VARIABLES NETTOYÉES**"""

results      = dfs["results"]
shootouts    = dfs["shootouts"]
goalscorers  = dfs["goalscorers"]
former_names = dfs["former_names"]

"""Résumé final"""

print("\n" + "="*55)
print("  RÉSUMÉ FINAL — DONNÉES NETTOYÉES")
print("="*55)
for name, df in dfs.items():
    print(f"  {name:<15} → {df.shape[0]:>6,} lignes  |  {df.shape[1]} colonnes  |  "
          f"{df.isnull().sum().sum()} valeurs nulles restantes")
print("\n✅ Nettoyage terminé. Les DataFrames sont prêts.\n")

"""* Shootouts a 429 valeurs nulles mais sur seulement 675 lignes"""

print(shootouts)

"""VÉRIFICATION : NaN dans first_shooter"""

# Séparer les lignes avec et sans first_shooter
avec_first = shootouts[shootouts["first_shooter"].notna()]
sans_first = shootouts[shootouts["first_shooter"].isna()]

print(f"  Enregistrements AVEC first_shooter : {len(avec_first)}")
print(f"  Enregistrements SANS first_shooter : {len(sans_first)}")

# Vérifier si ces lignes ont quand même un gagnant
print(f"\n  Parmi les NaN dans first_shooter...")
print(f"  → Ont-ils un 'winner' enregistré ?")
print(sans_first["winner"].value_counts(dropna=False).to_string())

# Afficher quelques exemples
print(f"\n  Exemples de lignes avec first_shooter = NaN :")
print(sans_first.head(10).to_string())

"""REMPLACEMENT DES NaN DANS first_shooter

"""

# Copie de travail — ne jamais modifier shootouts directement
shootouts_clean = shootouts.copy()
shootouts_clean["first_shooter"] = shootouts_clean["first_shooter"].fillna("Inconnu")

# Ajout d'une colonne indicatrice pour distinguer les valeurs connues des inconnues
shootouts_clean["first_shooter_connu"] = shootouts["first_shooter"].notna()

# Vérification finale
print("  Vérification après remplacement :")
print(f"  NaN restants dans first_shooter      : {shootouts_clean['first_shooter'].isna().sum()}")
print(f"  Enregistrements avec valeur connue   : {shootouts_clean['first_shooter_connu'].sum()}")
print(f"  Enregistrements avec valeur inconnue : {(~shootouts_clean['first_shooter_connu']).sum()}")

# Mise à jour dans le dictionnaire principal
dfs["shootouts"] = shootouts_clean

"""* Analyse des valeurs manquantes dans la colonne 'first_shooter' :
Sur 675 enregistrements, 429 ont un NaN dans cette colonne (63.5%). Après vérification, tous ces enregistrements possèdent bien un 'winner', ce qui confirme que les tirs au but ont bien eu lieu.
* L'absence de données s'explique par un manque de documentation historique : les matchs concernés datent majoritairement des années 1960-1970, une époque où le suivi statistique détaillé n'était pas encore systématique.

* **DÉCISION :** on conserve le DataFrame original intact et on travaille sur une copie. Remplacer les NaN directement serait risqué car on introduirait une valeur inventée là où l'information est simplement absente.

DIAGNOSTIC DES VALEURS NULLES : results & goalscorers
"""

# Analyse détaillée de results
print("=" * 55)
print("  RESULTS — Détail des valeurs nulles")
print("=" * 55)
nuls_results = results.isnull().sum()
nuls_results = nuls_results[nuls_results > 0]
for col, n in nuls_results.items():
    pct = (n / len(results)) * 100
    print(f"  {col:<20} → {n:>5} nuls  ({pct:.2f}%)")

print(f"\n  Exemples de lignes avec des nuls :")
print(results[results.isnull().any(axis=1)].head(5).to_string())

# Analyse détaillée de goalscorers
print("\n" + "=" * 55)
print("  GOALSCORERS — Détail des valeurs nulles")
print("=" * 55)
nuls_goals = goalscorers.isnull().sum()
nuls_goals = nuls_goals[nuls_goals > 0]
for col, n in nuls_goals.items():
    pct = (n / len(goalscorers)) * 100
    print(f"  {col:<20} → {n:>5} nuls  ({pct:.2f}%)")

print(f"\n  Exemples de lignes avec des nuls :")
print(goalscorers[goalscorers.isnull().any(axis=1)].head(5).to_string())

"""**ANALYSE CONTEXTUELLE DES VALEURS NULLES**

Vérifier les matchs sans score dans results
"""

print("=" * 55)
print("  RESULTS — Matchs sans score")
print("=" * 55)
sans_score = results[results["home_score"].isna()]
print(f"  Total matchs sans score : {len(sans_score)}")
print(f"\n  Répartition par tournoi :")
print(sans_score["tournament"].value_counts().head(10).to_string())
print(f"\n  Répartition temporelle :")
print(f"  Année min : {sans_score['date'].dt.year.min()}")
print(f"  Année max : {sans_score['date'].dt.year.max()}")
print(f"\n  Exemples :")
print(sans_score.head(5).to_string())

"""Vérifier les buts sans buteur dans goalscorers"""

print("\n" + "=" * 55)
print("  GOALSCORERS — Buts sans buteur")
print("=" * 55)
sans_buteur = goalscorers[goalscorers["scorer"].isna()]
print(f"  Total buts sans buteur : {len(sans_buteur)}")
print(f"\n  Sont-ils des own goals ?")
print(sans_buteur["own_goal"].value_counts(dropna=False).to_string())
print(f"\n  Sont-ils des penaltys ?")
print(sans_buteur["penalty"].value_counts(dropna=False).to_string())

"""Vérifier les buts sans minute"""

print("\n" + "=" * 55)
print("  GOALSCORERS — Buts sans minute")
print("=" * 55)
sans_minute = goalscorers[goalscorers["minute"].isna()]
print(f"  Total buts sans minute : {len(sans_minute)}")
print(f"\n  Répartition temporelle :")
print(f"  Année min : {sans_minute['date'].dt.year.min()}")
print(f"  Année max : {sans_minute['date'].dt.year.max()}")
print(f"\n  Exemples :")
print(sans_minute.head(5).to_string())

"""**TRAITEMENT DES VALEURS NULLES : results & goalscorers**"""

# RESULTS — 72 matchs sans score
# Ces matchs peuvent être des matchs abandonnés, annulés ou mal documentés.
# On conserve l'original et on crée une copie sans ces lignes pour les analyses
# qui nécessitent des scores (calcul de moyennes, tendances, etc.)
results_original = results.copy()
results_clean = results.dropna(subset=["home_score", "away_score"]).copy()

print("=" * 55)
print("  RESULTS")
print("=" * 55)
print(f"  Lignes original : {len(results_original)}")
print(f"  Lignes clean    : {len(results_clean)}")
print(f"  Matchs écartés  : {len(results_original) - len(results_clean)}")

# GOALSCORERS — 11 buts sans buteur
# Ni own goals ni penaltys — l'identité du buteur est simplement inconnue.
# On conserve l'original et dans la copie on remplace par "Inconnu"
# pour maintenir la cohérence avec le traitement de first_shooter.
goalscorers_original = goalscorers.copy()
goalscorers_clean = goalscorers.copy()
goalscorers_clean["scorer"] = goalscorers_clean["scorer"].fillna("Inconnu")
goalscorers_clean["scorer_connu"] = goalscorers["scorer"].notna()

# GOALSCORERS — 184 buts sans minute
# Tous entre 1960 et 1997 — absence de documentation historique.
# On conserve les NaN car -1 ou 0 induiraient en erreur les analyses temporelles.
# On ajoute uniquement une colonne indicatrice.
goalscorers_clean["minute_connue"] = goalscorers["minute"].notna()

print("\n" + "=" * 55)
print("  GOALSCORERS")
print("=" * 55)
print(f"  Lignes original            : {len(goalscorers_original)}")
print(f"  Buts avec buteur inconnu   : {(~goalscorers_clean['scorer_connu']).sum()}")
print(f"  Buts avec minute inconnue  : {(~goalscorers_clean['minute_connue']).sum()}")
print(f"  NaN restants dans scorer   : {goalscorers_clean['scorer'].isna().sum()}")
print(f"  NaN restants dans minute   : {goalscorers_clean['minute'].isna().sum()}")

# Mise à jour dans le dictionnaire principal
dfs["results"]     = results_clean
dfs["goalscorers"] = goalscorers_clean

print("\n✅ Traitement terminé. Récapitulatif final :")
for name, df in dfs.items():
    print(f"  {name:<15} → {df.shape[0]:>6,} lignes  |  "
          f"{df.isnull().sum().sum()} valeurs nulles restantes")
