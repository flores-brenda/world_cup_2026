# utils/clean.py
# -*- coding: utf-8 -*-

import pandas as pd
from utils.helpers import save_to_clean_data

def run(dfs):
    """
    Étape 2 : Nettoyage des données.
    Prend en entrée le dictionnaire 'dfs' généré par loader.py.
    """
    try:
        print("\n=== DÉMARRAGE DE L'ÉTAPE 2 : NETTOYAGE ===")
        
        # ── CONVERSION DES DATES ────────────
        for name, df in dfs.items():
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
                invalides = df["date"].isnull().sum()
                if invalides:
                    pct_invalides = (invalides / len(df)) * 100
                    if pct_invalides >= 10:
                        print(f"[{name}] ⚠️  {invalides} dates invalides ({pct_invalides:.1f}%). On ne supprime pas ! Il faut réviser en profondeur ce qui se passe avec ces données avant de prendre une décision.")
                    else:
                        print(f"[{name}] ⚠️  {invalides} dates invalides ({pct_invalides:.1f}%). Moins de 10% de nulos, on supprime sans peur.")
                        dfs[name] = df.dropna(subset=["date"])

        # ── SUPPRESSION DES DOUBLONS ────────────
        for name, df in dfs.items():
            avant = len(df)
            dfs[name] = df.drop_duplicates()
            supprimes = avant - len(dfs[name])
            if supprimes:
                print(f"[{name}] 🗑️  {supprimes} doublons supprimés")

        # ── NETTOYAGE DES ESPACES (STRINGS) ────────────
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

        # ── NORMALISATION DES BOOLÉENS ────────────
        for col in ["neutral", "own_goal", "penalty"]:
            for name, df in dfs.items():
                if col in df.columns:
                    dfs[name][col] = df[col].astype(str).str.strip().str.upper().map(
                        {"TRUE": True, "FALSE": False, "1": True, "0": False}
                    )

        # ── VÉRIFICATION DES SCORES ────────────
        neg_domicile = (dfs["results"]["home_score"] < 0).sum()
        neg_exterieur = (dfs["results"]["away_score"] < 0).sum()
        if neg_domicile or neg_exterieur:
            print(f"[results] ⚠️  Scores négatifs : domicile={neg_domicile}, extérieur={neg_exterieur}")
        else:
            print("[results] ✅ Aucun score négatif détecté")

        # ── CONVERSION DATES (FORMER_NAMES) ────────────
        for col in ["start_date", "end_date"]:
            if col in dfs["former_names"].columns:
                dfs["former_names"][col] = pd.to_datetime(
                    dfs["former_names"][col], errors="coerce"
                )

        # ── EXTRACTION POUR ANALYSE ────────────
        results      = dfs["results"]
        shootouts    = dfs["shootouts"]
        goalscorers  = dfs["goalscorers"]
        former_names = dfs["former_names"]

        # ── RÉSUMÉ INTERMÉDIAIRE ────────────
        print("\n" + "="*55)
        print("  RÉSUMÉ INTERMÉDIAIRE — DONNÉES NETTOYÉES")
        print("="*55)
        for name, df in dfs.items():
            print(f"  {name:<15} → {df.shape[0]:>6,} lignes  |  {df.shape[1]} colonnes  |  "
                  f"{df.isnull().sum().sum()} valeurs nulles restantes")

        # ── TRAITEMENT SPÉCIFIQUE : SHOOTOUTS ────────────
        avec_first = shootouts[shootouts["first_shooter"].notna()]
        sans_first = shootouts[shootouts["first_shooter"].isna()]
        
        shootouts_clean = shootouts.copy()
        shootouts_clean["first_shooter"] = shootouts_clean["first_shooter"].fillna("Inconnu")
        shootouts_clean["first_shooter_connu"] = shootouts["first_shooter"].notna()
        dfs["shootouts"] = shootouts_clean

        # ── TRAITEMENT SPÉCIFIQUE : RESULTS & GOALSCORERS ────────────
        # RESULTS — matchs sans score
        results_original = results.copy()
        nuls_scores = results[["home_score", "away_score"]].isnull().any(axis=1).sum()
        
        if nuls_scores > 0:
            pct_nuls_scores = (nuls_scores / len(results)) * 100
            if pct_nuls_scores >= 10:
                print(f"[results] ⚠️  {nuls_scores} scores manquants ({pct_nuls_scores:.1f}%). On ne supprime pas ! Il faut réviser en profondeur ce qui se passe avec ces données avant de prendre une décision.")
                results_clean = results.copy()
            else:
                print(f"[results] ⚠️  {nuls_scores} scores manquants ({pct_nuls_scores:.1f}%). Moins de 10% de nulos, on supprime sans peur.")
                results_clean = results.dropna(subset=["home_score", "away_score"]).copy()
        else:
            results_clean = results.copy()

        # GOALSCORERS — Traitement des buteurs et minutes inconnus
        goalscorers_clean = goalscorers.copy()
        goalscorers_clean["scorer"] = goalscorers_clean["scorer"].fillna("Inconnu")
        goalscorers_clean["scorer_connu"] = goalscorers["scorer"].notna()
        goalscorers_clean["minute_connue"] = goalscorers["minute"].notna()

        # Mise à jour dans le dictionnaire principal
        dfs["results"]     = results_clean
        dfs["goalscorers"] = goalscorers_clean

        print("\n✅ Traitement terminé. Récapitulatif final :")
        for name, df in dfs.items():
            print(f"  {name:<15} → {df.shape[0]:>6,} lignes  |  "
                  f"{df.isnull().sum().sum()} valeurs nulles restantes")
            
              


# ── EXPORTACIÓN DE LOS ARCHIVOS LIMPIOS ────────────
        print("\n⏳ Enregistrement des fichiers nettoyés dans 'data_clean/'...")
        
        for name, df in dfs.items():
            save_to_clean_data(df, f"{name}_clean.csv")

        print("=== FIN DE L'ÉTAPE 2 : NETTOYAGE ===")
        
        return dfs # El return siempre al final


    except Exception as e:
        print(f"❌ Erreur critique dans clean.py : {e}")
        raise e

if __name__ == "__main__":
    from utils.loader import run as loader_run
    dfs = loader_run()
    run(dfs)