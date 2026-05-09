import os
import pandas as pd

def save_to_clean_data(df: pd.DataFrame, filename: str, index: bool = False):
    """
    Sauvegarde un DataFrame en CSV dans le dossier 'data_clean'.
    Gère automatiquement la création du dossier s'il n'existe pas.
    
    Args:
        df (pd.DataFrame): Le DataFrame à sauvegarder.
        filename (str): Le nom du fichier (avec ou sans l'extension .csv).
        index (bool): Si True, sauvegarde l'index du DataFrame. Par défaut à False.
    """
    # S'assurer que le nom du fichier se termine par .csv
    if not filename.endswith('.csv'):
        filename += '.csv'
        
    # Le dossier cible
    folder_path = "data_clean"
    
    # Créer le dossier s'il n'existe pas
    os.makedirs(folder_path, exist_ok=True)
    
    # Construire le chemin complet
    file_path = os.path.join(folder_path, filename)
    
    # Sauvegarder
    try:
        df.to_csv(file_path, index=index, encoding='utf-8')
        print(f"✅ Fichier enregistré avec succès : {file_path}")
    except Exception as e:
        print(f"❌ Erreur lors de l'enregistrement de {file_path} : {e}")
        raise e
