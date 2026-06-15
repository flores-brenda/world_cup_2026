#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════╗
║   FIFA World Cup 2026 — Actualizador de Resultados          ║
║   Fuente: football-data.org (API gratuita y oficial)        ║
╠══════════════════════════════════════════════════════════════╣
║  SETUP (solo una vez):                                       ║
║  1. Regístrate en: https://www.football-data.org/client/register ║
║  2. Copia tu API key y pégala en API_KEY más abajo          ║
║  3. Instala dependencias: pip install requests               ║
║  4. Ejecuta: python actualizar_resultados.py                 ║
╚══════════════════════════════════════════════════════════════╝
"""

import requests
import json
import os
import sys
from datetime import datetime, timezone

# ─────────────────────────────────────────────────
# ⚙️  CONFIGURACIÓN — edita solo esta sección
# ─────────────────────────────────────────────────
API_KEY   = "TU_API_KEY_AQUI"          # ← Pega tu key gratuita de football-data.org
OUTPUT    = "data/resultados_2026.json"  # Ruta al JSON (relativa al proyecto)
MAX_PENDING = 12                          # Cuántos partidos futuros incluir en el JSON
# ─────────────────────────────────────────────────

BASE_URL   = "https://api.football-data.org/v4"
HEADERS    = {"X-Auth-Token": API_KEY}

# Mapeo de nombres oficiales FIFA → nombres usados en el proyecto
TEAM_NAME_MAP = {
    "Czech Republic":           "Czechia",
    "Czechia":                  "Czechia",
    "Côte d'Ivoire":            "Ivory Coast",
    "Cote d'Ivoire":            "Ivory Coast",
    "Türkiye":                  "Turkey",
    "Turkiye":                  "Turkey",
    "Bosnia & Herzegovina":     "Bosnia and Herzegovina",
    "Bosnia-Herzegovina":       "Bosnia and Herzegovina",
    "Korea Republic":           "South Korea",
    "Republic of Korea":        "South Korea",
    "DR Congo":                 "DR Congo",
    "Congo DR":                 "DR Congo",
    "Congo, DR":                "DR Congo",
    "Dem. Rep. Congo":          "DR Congo",
    "Curaçao":                  "Curacao",
    "Cabo Verde":               "Cape Verde",
    "United States":            "United States",
    "USA":                      "United States",
}

# Mapeo de grupo: "GROUP_A" → "A"
def parse_group(raw: str) -> str:
    if not raw:
        return ""
    return raw.replace("GROUP_", "").replace("Group ", "").strip()

def normalize(name: str) -> str:
    return TEAM_NAME_MAP.get(name, name)


def get_competition_id() -> int | None:
    """Busca el ID de la competición del Mundial 2026 en la API."""
    try:
        r = requests.get(f"{BASE_URL}/competitions", headers=HEADERS, timeout=10)
        r.raise_for_status()
        for comp in r.json().get("competitions", []):
            code = comp.get("code", "")
            name = comp.get("name", "")
            season = comp.get("currentSeason", {})
            year = str(season.get("startDate", ""))[:4]
            if code == "WC" and year in ("2026", "2025"):
                return comp["id"]
    except Exception as e:
        print(f"⚠️  No se pudo obtener el ID de competición: {e}")
    return None


def fetch_matches(competition_id: int | None) -> list:
    """Descarga todos los partidos del Mundial 2026."""
    # Intenta primero con el ID dinámico, luego con el código "WC"
    endpoints = []
    if competition_id:
        endpoints.append(f"{BASE_URL}/competitions/{competition_id}/matches")
    endpoints.append(f"{BASE_URL}/competitions/WC/matches")

    for url in endpoints:
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 200:
                print(f"✅ Conectado a: {url}")
                return r.json().get("matches", [])
            elif r.status_code == 403:
                print("❌ API Key inválida o sin permisos. Verifica tu clave en football-data.org")
                sys.exit(1)
        except requests.exceptions.ConnectionError:
            print(f"⚠️  Sin conexión a {url}")
    
    print("❌ No se pudo conectar a la API. Verifica tu conexión a internet.")
    sys.exit(1)


def build_match(m: dict) -> dict:
    """Convierte un match de la API al formato del proyecto."""
    status = m.get("status", "")
    
    home_score = None
    away_score = None
    if status == "FINISHED":
        ft = m.get("score", {}).get("fullTime", {})
        home_score = ft.get("home")
        away_score = ft.get("away")

    date_str = (m.get("utcDate") or "")[:10]  # "YYYY-MM-DD"
    
    venue    = (m.get("venue") or "").strip()
    city     = (m.get("area", {}) or {}).get("name", "").strip()
    
    # Para partidos de grupo, la ciudad está generalmente en el venue o en homeTeam.area
    home_area = (m.get("homeTeam", {}) or {}).get("area", {}) or {}
    if not city:
        city = home_area.get("name", "")

    return {
        "date":       date_str,
        "group":      parse_group(m.get("group", "") or ""),
        "home":       normalize(m.get("homeTeam", {}).get("name", "TBD")),
        "away":       normalize(m.get("awayTeam", {}).get("name", "TBD")),
        "home_score": home_score,
        "away_score": away_score,
        "stadium":    venue,
        "city":       city,
    }


def main():
    print("═" * 55)
    print("  FIFA World Cup 2026 — Actualizador de Resultados")
    print("═" * 55)

    if API_KEY == "TU_API_KEY_AQUI":
        print("\n❌ ERROR: No has configurado tu API key.")
        print("   1. Ve a: https://www.football-data.org/client/register")
        print("   2. Copia tu token gratuito")
        print(f"   3. Pégalo en la variable API_KEY de este script\n")
        sys.exit(1)

    print("\n🔍 Buscando competición Mundial 2026...")
    comp_id = get_competition_id()
    if comp_id:
        print(f"   ID encontrado: {comp_id}")
    else:
        print("   Usando código genérico 'WC'")

    print("\n📡 Descargando resultados...")
    raw_matches = fetch_matches(comp_id)
    print(f"   Total de partidos en la API: {len(raw_matches)}")

    # Construir y separar por estado
    all_matches = [build_match(m) for m in raw_matches]
    played  = [m for m in all_matches if m["home_score"] is not None]
    pending = [m for m in all_matches if m["home_score"] is None]

    # Ordenar jugados por fecha (más antiguo primero)
    played.sort(key=lambda m: m["date"])
    pending.sort(key=lambda m: m["date"])

    output = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "matches": played + pending[:MAX_PENDING]
    }

    # Guardar JSON
    os.makedirs(os.path.dirname(OUTPUT) or ".", exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {OUTPUT} actualizado correctamente")
    print(f"   ⚽ {len(played)} partidos jugados")
    print(f"   📅 {len(pending[:MAX_PENDING])} próximos partidos incluidos")
    print(f"   🕒 Última actualización: {output['last_updated']}")
    print("\n═" * 55)


if __name__ == "__main__":
    main()
