"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { AnimatedBackground } from "@/components/AnimatedBackground";

/**
 * Pełnoekranowy ekran „brak dostępu" dla serwera. Pokazywany, gdy zalogowany
 * użytkownik otworzy URL serwera, do którego nie ma uprawnień (nie ma go na
 * liście dostępnych serwerów zwracanej przez API). Wyłącznie informacyjny —
 * tłumaczy, jakie uprawnienia są wymagane, bez ujawniania danych serwera.
 */
export function AccessDenied() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-6">
      <AnimatedBackground />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <ShieldAlert size={28} />
        </span>

        <div>
          <h1 className="text-xl font-bold text-white">Brak dostępu do tego serwera</h1>
          <p className="mt-2 text-sm text-gray-400">
            Nie udało nam się potwierdzić, że masz uprawnienia administratora na tym
            serwerze. Panelem mogą zarządzać tylko osoby, które mają:
          </p>
        </div>

        <ul className="flex w-full flex-col gap-2 text-left text-sm text-gray-300">
          <li className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
            <span className="mt-0.5 text-primary">•</span>
            uprawnienie <strong className="text-white">Administrator</strong> na serwerze,
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
            <span className="mt-0.5 text-primary">•</span>
            uprawnienie <strong className="text-white">Zarządzanie serwerem</strong>, albo
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
            <span className="mt-0.5 text-primary">•</span>
            <strong className="text-white">rolę administratora</strong> nadaną w
            ustawieniach bota przez właściciela serwera.
          </li>
        </ul>

        <p className="text-xs text-gray-400">
          Jeśli uważasz, że to pomyłka, poproś właściciela serwera o nadanie odpowiedniej
          roli, a następnie odśwież tę stronę.
        </p>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft size={16} />
          Wróć do listy serwerów
        </Link>
      </div>
    </main>
  );
}
