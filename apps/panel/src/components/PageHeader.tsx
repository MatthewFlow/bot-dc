import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  category: string;
  title: React.ReactNode;
  description: string;
  /** Opcjonalna ikona sekcji (z nav.ts) — pokazywana w chipie po lewej. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * Nagłówek strony w stylu banera „hero" z przeglądu — gradient fioletowo-bursztynowy
 * z miękkimi plamami światła. Spójna kolorystyka na wszystkich podstronach serwera.
 */
export function PageHeader({
  category,
  title,
  description,
  icon: Icon,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-indigo-700/15 to-amber-500/10 p-6 sm:p-7 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        {Icon && (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-violet-200 sm:flex">
            <Icon size={24} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/80">
            {category}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-gray-300">{description}</p>
        </div>
      </div>
    </div>
  );
}
