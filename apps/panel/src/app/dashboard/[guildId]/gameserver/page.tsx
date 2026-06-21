"use client";

import { CalendarClock, Gamepad2, Users, Wrench } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";

const PREVIEW = [
  {
    icon: Gamepad2,
    title: "Status serwera",
    text: "Online/offline, mapa, gracze i limit, uptime — na żywo.",
  },
  {
    icon: Users,
    title: "Gracze online",
    text: "Lista graczy z akcjami kick / ban wprost z panelu.",
  },
  {
    icon: Wrench,
    title: "Akcje admina",
    text: "Ogłoszenia in-game, zapis świata, restart serwera.",
  },
  {
    icon: CalendarClock,
    title: "Zaplanowane",
    text: "Cykliczne ogłoszenia i restarty (przez kolejkę zadań).",
  },
];

export default function GameServerPage() {
  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="System"
        icon={Gamepad2}
        title={
          <>
            Serwer <span className="italic text-primary">gry</span>
          </>
        }
        description="Zarządzanie serwerem The Isle: Evrima przez RCON — wkrótce."
        className="mb-0"
      />

      {/* Komunikat „wkrótce" */}
      <div className="surface-raised rounded-xl border border-border bg-card p-10 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gamepad2 className="size-7" />
        </span>
        <span className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Wkrótce
        </span>
        <h2 className="mt-3 text-xl font-bold text-white">
          Integracja z serwerem gry w przygotowaniu
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
          Połączenie z The Isle: Evrima przez RCON jest na etapie projektowania. Ta
          zakładka będzie sterować serwerem gry wprost z panelu.
        </p>
      </div>

      {/* Wyszarzony podgląd tego, co będzie */}
      <div className="pointer-events-none select-none opacity-50">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PREVIEW.map((p) => (
            <div
              key={p.title}
              className="surface-raised rounded-xl border border-border bg-card p-5"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-gray-300">
                <p.icon className="size-5" />
              </span>
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="mt-1 text-xs text-gray-400">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
