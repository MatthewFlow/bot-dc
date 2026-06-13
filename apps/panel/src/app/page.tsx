import { Hand, ShieldCheck, Ticket, TrendingUp } from "lucide-react";
import type { CSSProperties } from "react";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { TiltCard } from "@/components/TiltCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

const FEATURES = [
  { icon: Hand, label: "Powitania", desc: "Wiadomości i embedy na wejście/wyjście" },
  { icon: TrendingUp, label: "Levele XP", desc: "Role za aktywność + leaderboard" },
  { icon: ShieldCheck, label: "Moderacja", desc: "Ostrzeżenia, bany, logi akcji" },
  { icon: Ticket, label: "Tickety", desc: "Zgłoszenia w prywatnych wątkach" },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <AnimatedBackground />

      <div className="jh-in relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="jh-glow flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-card text-2xl font-bold text-primary">
            JH
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Jurassic Haven</h1>
            <p className="mt-1 text-sm text-gray-300">Panel zarządzania botem Discord</p>
          </div>
        </div>

        <p className="max-w-sm text-gray-300">
          Zaloguj się przez Discord, aby konfigurować powitania, levele, role, moderację i
          tickety — wszystko z jednego miejsca.
        </p>

        {/* Login */}
        <a
          href={`${API_URL}/auth/discord`}
          className="jh-sheen flex items-center gap-3 rounded-xl bg-discord px-6 py-3 font-semibold text-white shadow-lg shadow-discord/20 outline-none transition hover:-translate-y-0.5 hover:bg-[#4752c4] focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.104 13.2 13.2 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Zaloguj się przez Discord
        </a>

        {/* Funkcje */}
        <div className="grid w-full grid-cols-2 gap-3 pt-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                style={{ "--i": i + 1 } as CSSProperties}
                className="jh-stagger"
              >
                <TiltCard className="flex h-full flex-col gap-1.5 surface-raised rounded-xl border border-border bg-card/70 p-4 text-left">
                  <Icon size={18} className="text-primary" />
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </TiltCard>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400">
          Wymaga uprawnień administratora na serwerze Discord.
        </p>
      </div>
    </main>
  );
}
