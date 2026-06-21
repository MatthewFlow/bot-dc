"use client";

import { Ban, Bone, Gamepad2, RotateCw, Save, Send, Users, UserX } from "lucide-react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { useGameServer } from "@/hooks/queries";
import { CARD } from "@/lib/cn";
import { relativeTime } from "@/lib/time";

const SOON_BADGE =
  "rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/** Wyszarzona, zablokowana mini-akcja (podgląd funkcji „wkrótce"). */
function LockedMini({ icon: Icon, label }: { icon: typeof UserX; label: string }) {
  return (
    <button
      disabled
      title="Wkrótce"
      className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-background px-2 py-1 text-xs text-gray-500 opacity-60"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function GameServerPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const serverQ = useGameServer(guildId);
  const server = serverQ.data;
  const players = server?.playerList ?? [];
  const dinos = server?.dinos ?? [];

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
        description="The Isle: Evrima — status, gracze i akcje serwera (RCON)."
        className="mb-0"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Status + gracze (na żywo) */}
        <div className="flex flex-col gap-6">
          <div className={CARD}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-white">Status</p>
              <span
                className={`flex items-center gap-1.5 text-xs ${server?.online ? "text-green-400" : "text-red-400"}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${server?.online ? "bg-green-500" : "bg-red-500"}`}
                />
                {server?.online ? "Online" : "Offline"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              <Stat
                label="Gracze"
                value={`${server?.players ?? 0}${server?.maxPlayers ? `/${server.maxPlayers}` : ""}`}
              />
              <Stat label="Mapa" value={server?.map ?? "—"} />
              <Stat label="Wersja" value={server?.version ?? "—"} />
              <Stat label="Nazwa" value={server?.name ?? "—"} />
            </div>
            <p className="px-5 py-2.5 text-xs text-gray-500">
              Zaktualizowano: {server?.updatedAt ? relativeTime(server.updatedAt) : "—"}
            </p>
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-white">
                Gracze online ({players.length})
              </p>
            </div>
            {players.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                Brak graczy online.
              </p>
            ) : (
              <div className="flex flex-col">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5 last:border-0"
                  >
                    <span className="min-w-0 truncate text-sm text-white">
                      {p.name}
                      {p.dino ? <span className="text-gray-400"> · {p.dino}</span> : null}
                    </span>
                    {/* Akcje na graczu — wkrótce (wyszarzone) */}
                    <div className="flex shrink-0 gap-1.5">
                      <LockedMini icon={UserX} label="Wyrzuć" />
                      <LockedMini icon={Ban} label="Ban" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dinozaury + akcje */}
        <div className="flex flex-col gap-6">
          {/* Dinozaury włączone na serwerze (na żywo) */}
          <div className={CARD}>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Bone className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-white">
                Dinozaury ({dinos.length})
              </p>
            </div>
            {dinos.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                Brak danych o dinozaurach.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-5">
                {dinos.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Akcje serwera — widoczne, ale zablokowane (wkrótce) */}
          <div className={CARD}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-white">Akcje serwera</p>
              <span className={SOON_BADGE}>wkrótce</span>
            </div>

            <div className="pointer-events-none flex select-none flex-col gap-4 p-6 opacity-60">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300">
                  Ogłoszenie in-game
                </label>
                <textarea
                  disabled
                  rows={3}
                  placeholder="Treść ogłoszenia…"
                  className="w-full resize-none rounded-lg bg-background px-3 py-2 text-sm text-white outline-none"
                />
                <button
                  disabled
                  className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-primary/40 px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Send size={15} /> Wyślij ogłoszenie
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-xs font-medium text-gray-300">
                  Sterowanie serwerem
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-gray-300"
                  >
                    <Save size={15} /> Zapisz świat
                  </button>
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-gray-300"
                  >
                    <RotateCw size={15} /> Restart serwera
                  </button>
                </div>
              </div>
            </div>

            <p className="border-t border-border px-6 py-3 text-xs text-gray-400">
              Akcje z panelu będą dostępne po podłączeniu serwera gry. Status i lista
              graczy działają na żywo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
