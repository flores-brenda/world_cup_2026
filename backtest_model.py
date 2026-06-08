import pandas as pd
import numpy as np
from scipy.stats import poisson

def run_backtest(tournament_name="FIFA World Cup", year=2022):
    print(f"\n{'='*40}")
    print(f"=== BACKTESTING: {tournament_name} {year} ===")
    print(f"{'='*40}")
    
    # 1. Charger les résultats globaux
    try:
        results = pd.read_csv("data_clean/results_clean.csv")
    except FileNotFoundError:
        print("Fichier results_clean.csv introuvable.")
        return 0, None
        
    results["date"] = pd.to_datetime(results["date"])
    
    # Identifier les matchs du tournoi cible
    target_matches = results[(results["tournament"] == tournament_name) & (results["date"].dt.year == year)].copy()
    
    if len(target_matches) == 0:
        print(f"Aucun match trouvé pour {tournament_name} {year}")
        return 0, None
        
    start_date = target_matches["date"].min()
    print(f"Date de début du tournoi : {start_date.date()}")
    print(f"Nombre de matchs à prédire : {len(target_matches)}")
    
    # 2. Filtrer l'historique avant le tournoi (ex: 8 ans avant pour refléter la génération)
    start_history = start_date - pd.DateOffset(years=8)
    history = results[(results["date"] >= start_history) & (results["date"] < start_date)].copy()
    
    print(f"Matchs historiques analysés ({start_history.date()} à {start_date.date()}) : {len(history):,}")
    
    # 3. PONDÉRATION (même que predictions.py)
    def get_weight(tournament):
        t = str(tournament).lower()
        if "fifa world cup" in t and "qualification" not in t:
            return 4.0
        elif "euro" in t or "copa américa" in t or "african cup of nations" in t or "asian cup" in t:
            if "qualification" in t:
                return 2.5
            return 3.0
        elif "friendly" in t:
            return 1.0
        else:
            return 1.5
            
    history["weight"] = history["tournament"].apply(get_weight)
    
    # Calcul de la moyenne
    total_weighted_matches = history["weight"].sum()
    total_weighted_goals = (history["home_score"] * history["weight"]).sum() + \
                           (history["away_score"] * history["weight"]).sum()
                           
    global_avg_goals = total_weighted_goals / (2 * total_weighted_matches)
    
    # 4. Calcul des forces pour les équipes du tournoi
    teams_in_tournament = set(target_matches["home_team"]).union(set(target_matches["away_team"]))
    
    team_strengths = {}
    for team in teams_in_tournament:
        home_m = history[history["home_team"] == team]
        away_m = history[history["away_team"] == team]
        
        matches_played_w = home_m["weight"].sum() + away_m["weight"].sum()
        
        if matches_played_w == 0:
            team_strengths[team] = {"attack": 1.0, "defense": 1.0}
            continue
            
        goals_scored_w = (home_m["home_score"] * home_m["weight"]).sum() + (away_m["away_score"] * away_m["weight"]).sum()
        goals_conceded_w = (home_m["away_score"] * home_m["weight"]).sum() + (away_m["home_score"] * away_m["weight"]).sum()
        
        team_avg_scored = goals_scored_w / matches_played_w
        team_avg_conceded = goals_conceded_w / matches_played_w
        
        att = team_avg_scored / global_avg_goals if global_avg_goals > 0 else 1.0
        dfn = team_avg_conceded / global_avg_goals if global_avg_goals > 0 else 1.0
        
        team_strengths[team] = {"attack": att, "defense": dfn}
        
    # 5. Prédiction des matchs du tournoi
    correct_outcomes = 0
    total_matches = len(target_matches)
    
    results_list = []
    
    for _, row in target_matches.iterrows():
        home = row["home_team"]
        away = row["away_team"]
        actual_home_goals = row["home_score"]
        actual_away_goals = row["away_score"]
        
        if actual_home_goals > actual_away_goals:
            actual_outcome = "1"
        elif actual_home_goals < actual_away_goals:
            actual_outcome = "2"
        else:
            actual_outcome = "X"
            
        # Calcul lambda Poisson
        # Ajouter un petit avantage à domicile (ou au moins éviter les probabilités à 0)
        # Historiquement, les tournois mondiaux sont souvent sur terrain neutre.
        lambda_home = team_strengths[home]["attack"] * team_strengths[away]["defense"] * global_avg_goals
        lambda_away = team_strengths[away]["attack"] * team_strengths[home]["defense"] * global_avg_goals
        
        # Probabilités (jusqu'à 10 buts)
        prob_1 = 0
        prob_X = 0
        prob_2 = 0
        
        for i in range(10):
            for j in range(10):
                p = poisson.pmf(i, lambda_home) * poisson.pmf(j, lambda_away)
                if i > j:
                    prob_1 += p
                elif i == j:
                    prob_X += p
                else:
                    prob_2 += p
                    
        # Pred outcome
        if prob_1 > prob_2 and prob_1 > prob_X:
            pred_outcome = "1"
        elif prob_2 > prob_1 and prob_2 > prob_X:
            pred_outcome = "2"
        else:
            pred_outcome = "X"
            
        if pred_outcome == actual_outcome:
            correct_outcomes += 1
            
        results_list.append({
            "Match": f"{home} vs {away}",
            "Actual": f"{int(actual_home_goals)}-{int(actual_away_goals)} ({actual_outcome})",
            "Pred Prob": f"1:{prob_1:.2f} X:{prob_X:.2f} 2:{prob_2:.2f}",
            "Pred": pred_outcome,
            "Correct": pred_outcome == actual_outcome
        })
        
    accuracy = correct_outcomes / total_matches
    print(f"\nPrécision du modèle (Résultat 1X2) : {accuracy:.2%} ({correct_outcomes}/{total_matches} matchs)")
    
    return accuracy, pd.DataFrame(results_list)

if __name__ == "__main__":
    acc_euro16, df_euro16 = run_backtest("UEFA Euro", 2016)
    acc_wc18, df_wc18 = run_backtest("FIFA World Cup", 2018)
    acc_euro21, df_euro21 = run_backtest("UEFA Euro", 2021)
    acc_wc, df_wc = run_backtest("FIFA World Cup", 2022)
    acc_euro, df_euro = run_backtest("UEFA Euro", 2024)
