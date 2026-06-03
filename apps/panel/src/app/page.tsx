import { Hand, ShieldCheck, Ticket, TrendingUp } from "lucide-react";

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
      {/* Tło — miękkie poświaty */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-[#d4a843]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-[#5865F2]/10 blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#1a1f2e] text-2xl font-bold text-[#d4a843] shadow-lg shadow-black/40">
            JH
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Jurassic Haven</h1>
            <p className="mt-1 text-sm text-gray-400">Panel zarządzania botem Discord</p>
          </div>
        </div>

        <p className="max-w-sm text-gray-400">
          Zaloguj się przez Discord, aby konfigurować powitania, levele, role, moderację i
          tickety — wszystko z jednego miejsca.
        </p>

        {/* Login */}
        <a
          href={`${API_URL}/auth/discord`}
          className="flex items-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3 font-semibold text-white shadow-lg shadow-[#5865F2]/20 outline-none transition hover:-translate-y-0.5 hover:bg-[#4752c4] focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.104 13.2 13.2 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Zaloguj się przez Discord
        </a>

        {/* Funkcje */}
        <div className="grid w-full grid-cols-2 gap-3 pt-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-[#1a1f2e]/70 p-4 text-left"
              >
                <Icon size={18} className="text-[#d4a843]" />
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-600">
          Wymaga uprawnień administratora na serwerze Discord.
        </p>
      </div>
    </main>
  );
}
