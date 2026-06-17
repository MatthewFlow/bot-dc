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
// Maksymalny kąt przechyłu (małe karty). Przy stałym kącie róg dużej karty „odpływa"
// o ~kąt × rozmiar, więc na większych elementach skalujemy kąt w dół, by trzymać
// ZBLIŻONE przesunięcie rogu w pikselach (REF = rozmiar karty, przy którym dajemy pełny kąt).
const MAX_DEG = 2;
const MIN_DEG = 0.6; // dolny limit — duże karty wciąż lekko reagują
const REF = 340; // px — „bazowa" mała karta

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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
      // Kąt skalowany rozmiarem: rotateX zależy od wysokości, rotateY od szerokości.
      // Dzięki temu róg karty przesuwa się o zbliżoną liczbę px niezależnie od wielkości.
      const intX = clamp((MAX_DEG * REF) / r.height, MIN_DEG, MAX_DEG);
      const intY = clamp((MAX_DEG * REF) / r.width, MIN_DEG, MAX_DEG);
      // Perspektywa rośnie z rozmiarem → duże karty mniej się deformują (płaszczą).
      const persp = clamp(Math.max(r.width, r.height) * 1.8, 900, 2600);
      // Odejmujemy 0.5, by środek karty = 0°.
      card.style.setProperty("--rx", `${((0.5 - py) * intX).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((px - 0.5) * intY).toFixed(2)}deg`);
      card.style.setProperty("--persp", `${persp.toFixed(0)}px`);
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
