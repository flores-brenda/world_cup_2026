// ── Compte à rebours ─────────────────────────────────────
function initCountdown() {
  const targetDate = new Date("2026-06-11T21:00:00+02:00").getTime();
  const el = document.getElementById("countdown");
  if (!el) return;

  const update = () => {
    const now      = Date.now();
    const distance = targetDate - now;

    if (distance < 0) {
      el.innerHTML = "🏆 LA COUPE DU MONDE EST COMMENCÉE !";
      return;
    }

    const days    = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    el.innerHTML =
      `J-${days} <span style="color:var(--muted); font-size:32px; vertical-align:middle; margin:0 8px;">|</span> ` +
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  update();
  setInterval(update, 1000);
}
