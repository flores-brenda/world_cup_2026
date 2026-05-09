# utils/loader.py
# -*- coding: utf-8 -*-

# 1. LES IMPORTATIONS DOIVENT ÊTRE TOUT EN HAUT (En dehors de la fonction)
import pandas as pd
import kagglehub
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import matplotlib.ticker as mtick
import os

# 2. DÉFINITION DE LA FONCTION (Le "main.py" va appeler cette fonction)
def run():
    """
    Étape 1 : Création des dossiers, téléchargement depuis Kaggle 
    et chargement des DataFrames.
    """
    try:
        print("=== DÉMARRAGE DE L'ÉTAPE 1 : LOADER ===")

        # ── CRÉER LES DOSSIERS NÉCESSAIRES ────────────
        os.makedirs("data_clean", exist_ok=True)
        os.makedirs("outputs/graphs", exist_ok=True)
        print("✅ Dossiers créés: data_clean/, outputs/graphs/")

        # ── TÉLÉCHARGEMENT ────────────
        print("⏳ Téléchargement des données depuis Kaggle...")
        path = kagglehub.dataset_download("martj42/international-football-results-from-1872-to-2017")
        print("✅ Chemin des données :", path)

        # ── CHARGEMENT DES CSV ────────────
        print("⏳ Lecture des fichiers CSV...")
        results      = pd.read_csv(f"{path}/results.csv")
        shootouts    = pd.read_csv(f"{path}/shootouts.csv")
        goalscorers  = pd.read_csv(f"{path}/goalscorers.csv")
        former_names = pd.read_csv(f"{path}/former_names.csv")

        # Regrouper tous les DataFrames dans un dictionnaire
        dfs = {
            "results":      results,
            "shootouts":    shootouts,
            "goalscorers":  goalscorers,
            "former_names": former_names,
        }
        print("✅ Fichiers chargés avec succès !")

        # ── INSPECTION INITIALE ────────────
        # (J'ai gardé ton code d'inspection exactement comme tu l'as écrit)
        for name, df in dfs.items():
            print(f"\n{'='*55}")
            print(f"  {name.upper()}")
            print(f"{'='*55}")
            print(f"  Lignes × Colonnes : {df.shape}")
            print(f"  Colonnes          : {list(df.columns)}")
            print(f"\n  Types de données :")
            print(df.dtypes.to_string())
            print(f"\n  Valeurs nulles par colonne :")
            print(df.isnull().sum().to_string())
            print(f"\n  Doublons exacts : {df.duplicated().sum()}")
            print(f"\n  3 premières lignes :")
            print(df.head(3).to_string())

        print("=== FIN DE L'ÉTAPE 1 : LOADER ===")

        # 3. RETOUR DES DONNÉES (CRUCIAL !)
        # C'est grâce à cette ligne que "clean.py" pourra recevoir le dictionnaire "dfs"
        return dfs

    except Exception as e:
        print(f"❌ Erreur critique dans loader.py : {e}")
        raise e # Relance l'erreur pour arrêter le main.py

if __name__ == "__main__":
    run()