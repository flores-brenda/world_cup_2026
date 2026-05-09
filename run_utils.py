import os
import subprocess
import sys

def run_all_scripts_in_folder(folder_path):
    """Exécute tous les fichiers .py dans le dossier spécifié."""
    # Vérifie si le dossier existe
    if not os.path.isdir(folder_path):
        print(f"Erreur : Le dossier '{folder_path}' n'existe pas.")
        return

    # Liste ordonnée des scripts à exécuter
    scripts_to_run = [
        "loader.py",
        "clean.py",
        "groups.py",
        "performance.py",
        "group_analysis.py",
        "winners.py",
        "linkedin.py",
        "predictions.py",
        "exportation_html.py"
    ]
    
    # On ne garde que les fichiers qui existent
    py_files = [f for f in scripts_to_run if os.path.exists(os.path.join(folder_path, f))]
    
    if not py_files:
        print(f"Aucun des fichiers spécifiés n'a été trouvé dans '{folder_path}'.")
        return

    print(f"Début de l'exécution séquentielle de {len(py_files)} script(s) dans '{folder_path}'...\n")

    for py_file in py_files:
        script_path = os.path.join(folder_path, py_file)
        print(f"{'='*40}")
        print(f"🚀 Exécution de : {py_file}")
        print(f"{'='*40}")
        try:
            # Ajoute le dossier courant au PYTHONPATH pour trouver le module 'utils'
            env = os.environ.copy()
            env["PYTHONPATH"] = os.path.abspath(os.path.dirname(__file__))
            env["PYTHONIOENCODING"] = "utf-8"
            
            # Exécute le script en spécifiant l'encodage utf-8 pour supporter les emojis
            result = subprocess.run([sys.executable, script_path], env=env, check=True, text=True, capture_output=True, encoding='utf-8')
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(f"Avertissements/Infos :\n{result.stderr}")
            print(f"✅ Succès : {py_file}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Échec lors de l'exécution de : {py_file}")
            print(f"Code de retour : {e.returncode}")
            print(f"Sortie standard :\n{e.stdout}")
            print(f"Sortie d'erreur :\n{e.stderr}")
        print("\n")

if __name__ == "__main__":
    # Nom du dossier contenant les scripts
    utils_folder = "utils"
    run_all_scripts_in_folder(utils_folder)
