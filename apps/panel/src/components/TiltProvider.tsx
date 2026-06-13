"use client";

import { useEffect } from "react";

/**
 * Globalny sterownik efektu przechyłu (tilt 3D) dla WSZYSTKICH kart. Cel: `.surface-raised`
 * (znacznik kart w całym panelu) oraz dowolny element jawnie oznaczony `.jh-tilt`.
 * Jeden delegowany listener `pointermove` znajduje kartę pod kursorem (`closest`) i ustawia
 * kąt przechyłu (--rx/--ry). Bez świetlnej poświaty — sam ruch karty (resztę rysuje CSS).
 *
 * Dzięki delegacji efekt obejmuje każdą kartę bez ref/handlerów per element. Ruch zlewany
 * do jednej klatki (`requestAnimationFrame`),
 * efekt tylko podczas hovera (zero kosztu w spoczynku, neutralny dla INP). Pomijany przy
 * `prefers-reduced-motion` oraz na urządzeniach bez kursora (dotyk).
 */
const INTENSITY = 4; // stopnie przechyłu — subtelnie (powyżej ~10° wygląda tandetnie)

export function TiltProvider() {
  useEffect(() => {
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasHover = window.matchMedia("(hover: hover)").matches;
    if (!motionOk || !hasHover) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    const update = () => {
      raf = 0;
      const target = document.elementFromPoint(x, y);
      const card = target?.closest<HTMLElement>(".surface-raised, .jh-tilt");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (x - r.left) / r.width;
      const py = (y - r.top) / r.height;
      // Tylko przechył (--rx/--ry) zależny od pozycji kursora. Poświata jest stała (CSS),
      // więc nie ustawiamy już --mx/--my. Odejmujemy 0.5, by środek karty = 0°.
      card.style.setProperty("--rx", `${((0.5 - py) * INTENSITY).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((px - 0.5) * INTENSITY).toFixed(2)}deg`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
