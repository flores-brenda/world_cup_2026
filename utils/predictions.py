import pandas as pd
import numpy as np
from utils.helpers import save_to_clean_data
from utils.groups import equipes_2026

def run():
    print("\n=== DÉMARRAGE DE L'ÉTAPE 6b : PRONOSTICS (POISSON) ===")
    
    try:
        # 1. Charger les résultats globaux
        results = pd.read_csv("data_clean/results_clean.csv")
        results["date"] = pd.to_datetime(results["date"])
        
        # 2. Filtrer les matchs récents (depuis 2014 pour refléter la génération actuelle)
        recent_matches = results[results["date"].dt.year >= 2014].copy()
        
        print(f"  Matchs analysés (depuis 2014) : {len(recent_matches):,}")
        
        # 3. PONDÉRATION DES TOURNOIS
        # Un but en Coupe du Monde vaut plus qu'un but en Match Amical
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
                
        recent_matches["weight"] = recent_matches["tournament"].apply(get_weight)
        
        # Calcul de la moyenne globale pondérée
        total_weighted_matches = recent_matches["weight"].sum()
        total_weighted_goals = (recent_matches["home_score"] * recent_matches["weight"]).sum() + \
                               (recent_matches["away_score"] * recent_matches["weight"]).sum()
                               
        global_avg_goals = total_weighted_goals / (2 * total_weighted_matches)
        print(f"  Moyenne globale pondérée de buts par équipe : {global_avg_goals:.2f}")

        # 4. Calcul des forces pour les 48 équipes de 2026
        team_strengths = []
        
        for team in equipes_2026:
            # Matchs joués
            home_matches = recent_matches[recent_matches["home_team"] == team]
            away_matches = recent_matches[recent_matches["away_team"] == team]
            
            # Matchs joués (pondérés)
            matches_played_w = home_matches["weight"].sum() + away_matches["weight"].sum()
            
            if matches_played_w == 0:
                team_strengths.append({
                    "equipe": team,
                    "attack_strength": 1.0,
                    "defense_weakness": 1.0,
                    "matches_played": 0
                })
                continue
                
            # Buts marqués et encaissés (pondérés)
            goals_scored_w = (home_matches["home_score"] * home_matches["weight"]).sum() + \
                             (away_matches["away_score"] * away_matches["weight"]).sum()
            goals_conceded_w = (home_matches["away_score"] * home_matches["weight"]).sum() + \
                               (away_matches["home_score"] * away_matches["weight"]).sum()
            
            team_avg_scored = goals_scored_w / matches_played_w
            team_avg_conceded = goals_conceded_w / matches_played_w
            
            # Calcul des forces relatives (vs Moyenne globale)
            attack_strength = team_avg_scored / global_avg_goals if global_avg_goals > 0 else 1.0
            defense_weakness = team_avg_conceded / global_avg_goals if global_avg_goals > 0 else 1.0
            
            team_strengths.append({
                "equipe": team,
                "attack_strength": round(attack_strength, 3),
                "defense_weakness": round(defense_weakness, 3),
                "matches_played": len(home_matches) + len(away_matches)
            })
            
        df_strengths = pd.DataFrame(team_strengths)
        
        # 5. Sauvegarder dans data_clean
        save_to_clean_data(df_strengths, "team_strengths.csv")
        
        # Sauvegarder aussi la moyenne globale pour le JS
        global_stats = pd.DataFrame([{"global_avg_goals": round(global_avg_goals, 3)}])
        save_to_clean_data(global_stats, "global_stats.csv")
        
        print("✅ Forces d'attaque et défense calculées avec succès.")
        print("=== FIN DE L'ÉTAPE 6b : PRONOSTICS ===")
        
    except FileNotFoundError:
        print("❌ Erreur : results_clean.csv introuvable. Exécutez d'abord clean.py.")
        raise

if __name__ == "__main__":
    run()
