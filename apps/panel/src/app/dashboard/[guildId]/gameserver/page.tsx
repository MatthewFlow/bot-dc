"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Megaphone, Trash2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { useGameAnnounces, useGameServer } from "@/hooks/queries";
import { cancelGameAnnounce, createGameAnnounce, queryKeys } from "@/lib/api";
import { relativeTime } from "@/lib/time";

const CARD = "surface-raised rounded-xl border border-border bg-card";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function GameServerPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();
  const qc = useQueryClient();

  const serverQ = useGameServer(guildId);
  const announcesQ = useGameAnnounces(guildId);
  const server = serverQ.data;
  const announces = announcesQ.data ?? [];

  const [message, setMessage] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) {
      toast("Wpisz treść ogłoszenia.", "error");
      return;
    }
    setSending(true);
    try {
      await createGameAnnounce(guildId, message.trim(), minutes || undefined);
      setMessage("");
      qc.invalidateQueries({ queryKey: queryKeys.gameAnnounces(guildId) });
      toast(
        minutes ? "Ogłoszenie zaplanowane." : "Ogłoszenie zlecone (wyśle się w ~30 s).",
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelGameAnnounce(guildId, id);
      qc.invalidateQueries({ queryKey: queryKeys.gameAnnounces(guildId) });
      toast("Anulowano.", "success");
    } catch {
      toast("Nie udało się anulować.", "error");
    }
  }

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
        description="The Isle: Evrima — status, gracze i ogłoszenia (RCON)."
        className="mb-0"
      />

      {serverQ.isLoading ? (
        <div className={`${CARD} p-10 text-center text-sm text-gray-400`}>Ładowanie…</div>
      ) : !server?.configured ? (
        <div className={`${CARD} p-10 text-center`}>
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Gamepad2 className="size-7" />
          </span>
          <h2 className="text-xl font-bold text-white">Integracja nieskonfigurowana</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Ustaw <code className="text-primary">RCON_HOST/PORT/PASSWORD</code> w
            środowisku bota, by zobaczyć tu status serwera gry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* Status + gracze */}
          <div className="flex flex-col gap-6">
            <div className={CARD}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-white">Status</p>
                <span
                  className={`flex items-center gap-1.5 text-xs ${server.online ? "text-green-400" : "text-red-400"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${server.online ? "bg-green-500" : "bg-red-500"}`}
                  />
                  {server.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <Stat
                  label="Gracze"
                  value={`${server.players}${server.maxPlayers ? `/${server.maxPlayers}` : ""}`}
                />
                <Stat label="Mapa" value={server.map ?? "—"} />
                <Stat label="Nazwa" value={server.name ?? "—"} />
                <Stat
                  label="Aktualizacja"
                  value={server.updatedAt ? relativeTime(server.updatedAt) : "—"}
                />
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-white">
                  Gracze online ({server.playerList.length})
                </p>
              </div>
              {server.playerList.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-gray-400">
                  Brak graczy online.
                </p>
              ) : (
                <div className="flex flex-col">
                  {server.playerList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5 last:border-0"
                    >
                      <span className="truncate text-sm text-white">
                        {p.name}
                        {p.dino ? (
                          <span className="text-gray-400"> · {p.dino}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-gray-500">
                        {p.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ogłoszenia */}
          <div className="flex flex-col gap-6">
            <PanelCard
              title="Ogłoszenie in-game"
              description="Wyślij teraz lub zaplanuj broadcast na serwerze gry"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Treść ogłoszenia…"
                className="w-full resize-y rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                <span>Wyślij:</span>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={0}>Jak najszybciej</option>
                  <option value={5}>za 5 min</option>
                  <option value={15}>za 15 min</option>
                  <option value={30}>za 30 min</option>
                  <option value={60}>za 1 godz</option>
                </select>
              </div>
              <Button onClick={handleSend} disabled={sending} className="w-full">
                {sending ? "Wysyłanie…" : "Wyślij ogłoszenie"}
              </Button>
              <p className="text-xs text-gray-400">
                Akcje idą przez kolejkę bota — „jak najszybciej” oznacza do ~30 s.
              </p>
            </PanelCard>

            <div className={CARD}>
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Megaphone className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-white">Zaplanowane ogłoszenia</p>
              </div>
              {announces.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-gray-400">
                  Brak zaplanowanych.
                </p>
              ) : (
                <div className="flex flex-col">
                  {announces.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{j.text}</p>
                        <p className="text-xs text-gray-400">{relativeTime(j.runAt)}</p>
                      </div>
                      <button
                        onClick={() => handleCancel(j.id)}
                        title="Anuluj"
                        className="shrink-0 rounded-lg bg-background p-1.5 text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
