# ⚽ FIFA World Cup 2026 — Analyse Data Science

> Analyse historique et interactive des équipes qualifiées pour la Coupe du Monde 2026, basée sur des données de matchs internationaux de 1872 à 2025.

🌐 **[Voir le projet en ligne](https://flores-brenda.github.io/world_cup_2026/)**

---

## 📌 Description

Ce projet est une application web de data science qui explore les performances historiques des 48 équipes qualifiées pour la FIFA World Cup 2026. Il combine traitement de données en Python, modélisation statistique (loi de Poisson) et visualisation interactive en JavaScript/HTML.

Le projet est disponible en trois langues : 🇫🇷 Français · 🇪🇸 Español · 🇬🇧 English

---

## ✨ Fonctionnalités

### 📊 Classement historique
- Points cumulés et taux de victoire de toutes les équipes qualifiées
- Top 10 par points et par taux de victoire
- Classement complet interactif

### 🗂️ Groupes 2026
- Visualisation du tirage au sort FIFA (5 décembre 2025) — 12 groupes, 48 équipes
- Moyenne des points historiques par groupe
- Comparaison favori vs moyenne du groupe

### 📈 Performance globale
- Scatter plot : Taux de victoire × Points historiques
- Distribution des matchs joués et des buts marqués
- Comparatif buts pour / contre (Top 12)

### 🏆 Palmarès
- Titres FIFA World Cup des champions qualifiés pour 2026

### 🤖 Simulateur de match
- Prédiction basée sur la **loi de Poisson** (matchs depuis 2014)
- Expected Goals (xG) pour chaque sélection
- Probabilités victoire / nul / défaite
- Historique de face-à-face entre deux équipes

### 🔄 Simulateur de phase de groupes
- Simulation dynamique de la phase de groupes
- Classement final simulé avec points et différence de buts

---

## 🗂️ Structure du projet

```
world_cup_2026/
│
├── index.html          # Application web principale (multilingue)
├── main.py             # Script principal de traitement des données
├── run_utils.py        # Exécution des utilitaires
│
├── data_clean/         # Données nettoyées et prétraitées
├── front/              # Assets front-end (JS, CSS)
├── utils/              # Fonctions utilitaires Python
├── tests/              # Tests unitaires
│
└── .gitignore
```

---

## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| Traitement des données | Python, pandas, NumPy |
| Modélisation statistique | Loi de Poisson |
| Visualisation | JavaScript, Chart.js, CSS |
| Interface | HTML5, CSS3 (responsive, multilingue) |
| Déploiement | GitHub Pages |

---

## 📂 Source des données

Dataset Kaggle : [International Football Results 1872–2025](https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017) — par **martj42**

Couvre l'ensemble des matchs internationaux officiels depuis 1872 jusqu'à 2025.

---

## 🚀 Lancer le projet en local

```bash
# Cloner le dépôt
git clone https://github.com/flores-brenda/world_cup_2026.git
cd world_cup_2026

# Installer les dépendances Python
pip install -r requirements.txt

# Générer les données nettoyées
python main.py

# Ouvrir l'interface
# Ouvrir index.html dans un navigateur (ou utiliser Live Server)
```

---

## 👩‍💻 Auteure

**Brenda Flores**
Analyste de données · Actuariat & Data Science
📍 Nice, France

[![GitHub](https://img.shields.io/badge/GitHub-flores--brenda-181717?logo=github)](https://github.com/flores-brenda)

---

## 📄 Licence

Ce projet est à vocation éducative et personnelle. Les données utilisées appartiennent à leurs auteurs respectifs sur Kaggle.
