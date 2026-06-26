"use client";

import { Gift, RotateCw, Timer, Trophy, Users, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useChannels, useGiveaways } from "@/hooks/queries";
import type { Giveaway } from "@/lib/api";
import { cancelGiveaway, createGiveaway, endGiveaway, rerollGiveaway } from "@/lib/api";
import { CARD } from "@/lib/cn";

type Unit = "minutes" | "hours" | "days";
const UNIT_MS: Record<Unit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};
const UNIT_LABEL: Record<Unit, string> = {
  minutes: "minut",
  hours: "godzin",
  days: "dni",
};

/** Czas pozostały do zakończenia (przyszłość) — „za 2 godz". */
function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "kończy się…";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `za ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `za ${h} godz`;
  return `za ${Math.floor(h / 24)} dni`;
}

export default function GiveawaysPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const channelsQ = useChannels(guildId);
  const giveawaysQ = useGiveaways(guildId);
  const channels = channelsQ.data ?? [];
  const list = giveawaysQ.data ?? [];

  const [prize, setPrize] = useState("");
  const [channelId, setChannelId] = useState("");
  const [winners, setWinners] = useState(1);
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<Unit>("hours");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: "end" | "cancel" } | null>(
    null,
  );

  const canCreate =
    prize.trim().length > 0 && channelId !== "" && winners >= 1 && durationValue >= 1;

  async function handleCreate() {
    if (!canCreate) {
      toast("Uzupełnij nagrodę, kanał i czas.", "error");
      return;
    }
    const endsAt = new Date(
      Date.now() + durationValue * UNIT_MS[durationUnit],
    ).toISOString();
    try {
      await createGiveaway(guildId, {
        channelId,
        prize: prize.trim(),
        winnerCount: winners,
        endsAt,
      });
      setPrize("");
      await giveawaysQ.refetch();
      toast("Giveaway utworzony i opublikowany.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się utworzyć.", "error");
    }
  }

  async function runAction(
    id: string,
    fn: () => Promise<Giveaway>,
    okMsg: string,
  ): Promise<void> {
    setBusyId(id);
    try {
      await fn();
      await giveawaysQ.refetch();
      toast(okMsg, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Operacja nie powiodła się.", "error");
    } finally {
      setBusyId(null);
    }
  }

  const active = list.filter((g) => g.status === "active");
  const past = list.filter((g) => g.status !== "active");

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Społeczność"
        icon={Gift}
        title={
          <>
            Give<span className="italic text-primary">awaye</span>
          </>
        }
        description="Twórz konkursy — bot odlicza czas, zbiera uczestników i losuje zwycięzców."
        className="mb-0"
      />

      {/* Formularz tworzenia */}
      <div className={CARD}>
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gift className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Nowy giveaway</p>
            <p className="text-xs text-gray-400">
              Nagroda, kanał, czas i liczba zwycięzców
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400" htmlFor="gw-prize">
              Nagroda <span className="text-destructive">*</span>
            </label>
            <input
              id="gw-prize"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              maxLength={256}
              placeholder="np. Nitro Classic na miesiąc"
              className="w-full rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Kanał <span className="text-destructive">*</span>
            </label>
            <ChannelSelect
              value={channelId}
              onChange={setChannelId}
              channels={channels}
              className="w-full px-3 py-2.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400" htmlFor="gw-winners">
              Liczba zwycięzców <span className="text-destructive">*</span>
            </label>
            <input
              id="gw-winners"
              type="number"
              min={1}
              max={50}
              value={winners}
              onChange={(e) =>
                setWinners(Math.max(1, Math.min(50, Number(e.target.value))))
              }
              className="w-full rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">
              Czas trwania <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={durationValue}
                onChange={(e) => setDurationValue(Math.max(1, Number(e.target.value)))}
                className="w-28 rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as Unit)}
                className="rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              >
                {(["minutes", "hours", "days"] as Unit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2 flex justify-end border-t border-border pt-4">
            <SaveButton
              onClick={handleCreate}
              disabled={!canCreate}
              label="Utwórz giveaway"
              className="px-5 py-2"
            />
          </div>
        </div>
      </div>

      {/* Aktywne */}
      <Section
        icon={Timer}
        title="Aktywne"
        loading={giveawaysQ.isLoading}
        empty={active.length === 0 ? "Brak aktywnych giveawayów." : null}
      >
        {active.map((g) => (
          <Row key={g.id} g={g}>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Timer className="size-3.5" /> {timeLeft(g.endsAt)}
            </span>
            <button
              onClick={() => setConfirm({ id: g.id, action: "end" })}
              disabled={busyId === g.id}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Zakończ teraz
            </button>
            <button
              onClick={() => setConfirm({ id: g.id, action: "cancel" })}
              disabled={busyId === g.id}
              title="Anuluj"
              className="flex size-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </Row>
        ))}
      </Section>

      {/* Zakończone / anulowane */}
      <Section
        icon={Trophy}
        title="Zakończone"
        loading={giveawaysQ.isLoading}
        empty={past.length === 0 ? "Tu pojawią się rozstrzygnięte giveawaye." : null}
      >
        {past.map((g) => (
          <Row key={g.id} g={g}>
            <span className="text-xs text-gray-400">
              {g.status === "cancelled" ? "anulowany" : `${g.winners.length} zwycięzców`}
            </span>
            {g.status === "ended" && (
              <button
                onClick={() =>
                  void runAction(
                    g.id,
                    () => rerollGiveaway(guildId, g.id),
                    "Wylosowano ponownie.",
                  )
                }
                disabled={busyId === g.id}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <RotateCw className="size-3.5" /> Reroll
              </button>
            )}
          </Row>
        ))}
      </Section>

      {confirm && (
        <ConfirmModal
          message={
            confirm.action === "end"
              ? "Zakończyć ten giveaway teraz? Bot wylosuje zwycięzców w ciągu kilku sekund."
              : "Anulować ten giveaway? Nie zostaną wylosowani zwycięzcy."
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { id, action } = confirm;
            setConfirm(null);
            void runAction(
              id,
              () =>
                action === "end" ? endGiveaway(guildId, id) : cancelGiveaway(guildId, id),
              action === "end" ? "Giveaway kończy się…" : "Giveaway anulowany.",
            );
          }}
        />
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  loading,
  empty,
  children,
}: {
  icon: typeof Timer;
  title: string;
  loading: boolean;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={`${CARD} flex flex-col`}>
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-primary">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : empty ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}

function Row({ g, children }: { g: Giveaway; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Gift className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{g.prize}</p>
        <p className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="size-3" /> {g.entrants.length} uczestników · {g.winnerCount}{" "}
          do wygrania
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
