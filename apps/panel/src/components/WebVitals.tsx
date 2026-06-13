"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reporter Core Web Vitals (LCP / CLS / INP + FCP / TTFB). Mierzy metryki z PRAWDZIWEGO
 * renderu przeglądarki — INP-a w szczególności nie da się sensownie zmierzyć w testach „lab",
 * bo wymaga realnych interakcji użytkownika.
 *
 * Loguje tylko w trybie deweloperskim (kolor wg progu Google), więc nie zaśmieca produkcji
 * ani nie wpływa na jej zachowanie. Komponent nic nie renderuje. Aby wysyłać metryki na
 * backend/analytics, dorzuć tu `fetch`/`navigator.sendBeacon` w gałęzi produkcyjnej.
 */
const RATING_COLOR: Record<string, string> = {
  good: "#57f287",
  "needs-improvement": "#d4a843",
  poor: "#ed4245",
};

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "production") return;
    // CLS jest bezwymiarowe (0–1), reszta to milisekundy.
    const value =
      metric.name === "CLS" ? metric.value.toFixed(3) : `${Math.round(metric.value)} ms`;
    const color = RATING_COLOR[metric.rating] ?? "#9ca3af";
    console.log(
      `%c● ${metric.name}%c ${value} %c${metric.rating}`,
      `color:${color};font-weight:bold`,
      "color:inherit;font-weight:bold",
      `color:${color}`,
    );
  });
  return null;
}
