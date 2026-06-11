import type { ReactNode } from "react";

/**
 * Wspólna karta sekcji: nagłówek (tytuł + opcjonalny opis i akcja po prawej) oraz
 * body w równym odstępie. Jedno źródło wyglądu kart edytorów/konfiguracji w panelu —
 * zmiany wyglądu kart robisz tutaj, nie na każdej stronie.
 */
export function PanelCard({
  title,
  description,
  action,
  bodyClassName = "flex flex-col gap-4 p-6",
  className = "",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Element po prawej stronie nagłówka (np. przycisk zapisu / „Anuluj"). */
  action?: ReactNode;
  /** Klasy body — domyślnie pionowy stack z odstępem; podaj np. "p-6" dla zwykłej treści. */
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`surface-raised rounded-xl bg-card ${className}`}>
      <div
        className={`border-b border-border px-6 py-4 ${
          action ? "flex items-center justify-between gap-4" : ""
        }`}
      >
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
