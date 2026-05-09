// ── Cache localStorage ────────────────────────────────────
function initCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const p = JSON.parse(cached);
      if (Date.now() - p.ts < 86400000) {
        console.log("✅ Cache localStorage actif");
        return p.data;
      }
    }
  } catch (e) {}
  const data = { stats: [...RAW_STATS].sort((a, b) => b.PTS - a.PTS) };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
  console.log("✅ Données mises en cache");
  return data;
}
