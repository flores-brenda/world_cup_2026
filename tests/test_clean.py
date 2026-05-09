import unittest
import pandas as pd
from unittest.mock import patch
import sys
import os

# Ajouter le répertoire racine au sys.path pour permettre les imports 'utils'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.clean import run

class TestClean(unittest.TestCase):

    @patch('utils.clean.save_to_clean_data')
    def test_run_cleans_data(self, mock_save):
        """
        Teste si la fonction `run()` nettoie correctement les données :
        - Conversion des dates et suppression des dates invalides
        - Nettoyage des espaces (strings)
        - Normalisation des booléens
        - Gestion des valeurs manquantes (scores, buteurs, etc.)
        """
        
        # 1. Création de données "sales" (mock data) avec <= 10% de dates invalides
        # On crée 10 lignes normales et 1 ligne invalide (1/11 = 9%)
        valid_dates = ["1872-11-30"] * 9 + ["1900-01-01"]
        dates_list = valid_dates + ["invalid_date"]
        
        dfs = {
            "results": pd.DataFrame({
                "date": dates_list,
                "home_team": [" Scotland "] * 11,
                "away_team": ["England"] * 11,
                "tournament": ["Friendly"] * 11,
                "city": ["Glasgow"] * 11,
                "country": ["Scotland"] * 11,
                "neutral": ["TRUE"] * 11,
                "home_score": [0] * 10 + [pd.NA], # Le dernier a un score manquant
                "away_score": [0] * 10 + [pd.NA]
            }),
            "shootouts": pd.DataFrame({
                "home_team": ["Team A"],
                "away_team": ["Team B"],
                "winner": ["Team A"],
                "first_shooter": [pd.NA] # Valeur manquante
            }),
            "goalscorers": pd.DataFrame({
                "home_team": ["Team A"],
                "away_team": ["Team B"],
                "team": ["Team A"],
                "scorer": [pd.NA], # Valeur manquante
                "minute": [pd.NA], # Valeur manquante
                "own_goal": ["1"], # Booléen (1 = True)
                "penalty": ["FALSE"] # Booléen
            }),
            "former_names": pd.DataFrame({
                "current": ["Cur", "Cur2"],
                "former": ["For ", "For2"],
                "start_date": ["1900-01-01", "invalid"],
                "end_date": ["1950-01-01", "invalid"]
            })
        }
        
        # 2. Exécution de la fonction de nettoyage
        cleaned_dfs = run(dfs)
        
        # 3. Vérifications (Assertions)
        
        # A. La ligne avec 'invalid_date' (9% < 10%) et celle avec 'pd.NA' dans score doivent être supprimées.
        # Il reste 9 lignes parfaites sur les 11 (1 date invalide, 1 score manquant)
        self.assertEqual(len(cleaned_dfs["results"]), 9)
        
        # B. Les espaces doivent être retirés (ex: " Scotland " -> "Scotland")
        self.assertEqual(cleaned_dfs["results"]["home_team"].iloc[0], "Scotland")
        
        # C. Les booléens doivent être convertis en vrais booléens Python/Numpy
        self.assertEqual(cleaned_dfs["results"]["neutral"].iloc[0], True)
        self.assertEqual(cleaned_dfs["goalscorers"]["own_goal"].iloc[0], True)
        self.assertEqual(cleaned_dfs["goalscorers"]["penalty"].iloc[0], False)
        
        # D. Gestion des valeurs manquantes dans shootouts (first_shooter -> Inconnu)
        self.assertEqual(cleaned_dfs["shootouts"]["first_shooter"].iloc[0], "Inconnu")
        self.assertEqual(cleaned_dfs["shootouts"]["first_shooter_connu"].iloc[0], False)
        
        # E. Gestion des valeurs manquantes dans goalscorers (scorer -> Inconnu)
        self.assertEqual(cleaned_dfs["goalscorers"]["scorer"].iloc[0], "Inconnu")
        self.assertEqual(cleaned_dfs["goalscorers"]["scorer_connu"].iloc[0], False)
        self.assertEqual(cleaned_dfs["goalscorers"]["minute_connue"].iloc[0], False)
        
        # F. Vérifier que la fonction save_to_clean_data a bien été appelée 4 fois (une fois par DataFrame)
        # On utilise le @patch pour simuler la sauvegarde et ne pas créer de vrais fichiers pendant le test.
        self.assertEqual(mock_save.call_count, 4)

    @patch('utils.clean.save_to_clean_data')
    def test_run_does_not_drop_if_more_than_10_percent_nulls(self, mock_save):
        """
        Teste spécifiquement la règle des 10% :
        Si plus de 10% des dates sont invalides, les lignes ne doivent PAS être supprimées.
        """
        # Création d'un dataset avec 3 lignes : 2 valides, 1 invalide
        # 1/3 = 33.3%, ce qui est strictement supérieur à 10%.
        dfs = {
            "results": pd.DataFrame({
                "date": ["2020-01-01", "2020-01-02", "invalide"],
                "home_team": ["A", "B", "C"],
                "away_team": ["D", "E", "F"],
                "home_score": [1, 2, 3],
                "away_score": [0, 1, 2]
            }),
            "shootouts": pd.DataFrame(columns=["first_shooter"]),
            "goalscorers": pd.DataFrame(columns=["scorer", "minute"]),
            "former_names": pd.DataFrame()
        }
        
        cleaned_dfs = run(dfs)
        
        # Le dataset doit toujours contenir 3 lignes, car 33% > 10%
        # La date invalide est devenue NaT (valeur nulle de Pandas pour les dates) mais la ligne est conservée
        self.assertEqual(len(cleaned_dfs["results"]), 3)
        self.assertTrue(pd.isna(cleaned_dfs["results"]["date"].iloc[2]))

if __name__ == "__main__":
    unittest.main()
