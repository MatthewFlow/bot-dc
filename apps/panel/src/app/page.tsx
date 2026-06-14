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
            <h1 className="jh-brand-text text-3xl font-bold">Jurassic Haven</h1>
            <p className="mt-1 text-sm text-gray-300">Panel zarządzania botem Discord</p>
          </div>
        </div>

        <p className="max-w-sm text-gray-300">
          Zaloguj się przez Discord, aby konfigurować powitania, levele, role, moderację i
          tickety — wszystko z jednego miejsca.
        </p>

        {/* Login */}
        <div className="relative">
          <div aria-hidden className="jh-cta-aura" />
          <a
            href={`${API_URL}/auth/discord`}
            className="jh-sheen group relative z-10 flex items-center gap-3 rounded-xl bg-discord px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-discord/20 outline-none transition hover:-translate-y-0.5 hover:bg-[#4752c4] focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.98]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              className="transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            Zaloguj się przez Discord
          </a>
        </div>

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
