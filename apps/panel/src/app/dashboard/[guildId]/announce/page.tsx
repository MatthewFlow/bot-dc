"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Clock, Hash, Megaphone, PenLine, Repeat, Send, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { type CSSProperties, useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBotStatus, useChannels, useJobs } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import type { BotJob, Channel, EmbedConfig } from "@/lib/api";
import { createJob, deleteJob, queryKeys } from "@/lib/api";
import { CARD } from "@/lib/cn";
import { isEmbedEmpty, previewReplacer } from "@/lib/embed";
import { relativeTime } from "@/lib/time";

const EmbedEditor = dynamic(
  () => import("@/components/EmbedEditor").then((m) => m.EmbedEditor),
  { loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

const DEFAULT_EMBED: EmbedConfig = {
  title: "📢 Ogłoszenie",
  description: "Treść ogłoszenia…",
  color: 0xd4a843,
};

type Mode = "now" | "schedule" | "recurring";

const RECURRENCE_LABEL: Record<BotJob["recurrence"], string> = {
  once: "jednorazowo",
  daily: "codziennie",
  weekly: "co tydzień",
};

/** Lokalny datetime → ISO; pusty/niepoprawny = null. */
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const MODE_OPTIONS: SegmentOption<Mode>[] = [
  { value: "now", label: "Teraz", icon: Send },
  { value: "schedule", label: "Zaplanuj", icon: Clock },
  { value: "recurring", label: "Cyklicznie", icon: Repeat },
];

export default function AnnouncePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();
  const qc = useQueryClient();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [embed, setEmbed] = useState<EmbedConfig>(DEFAULT_EMBED);
  const [mode, setMode] = useState<Mode>("now");
  const [runAtLocal, setRunAtLocal] = useState("");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly">("daily");
  const [submitting, setSubmitting] = useState(false);

  const channelsQ = useChannels(guildId);
  const botStatusQ = useBotStatus();
  const jobsQ = useJobs(guildId);
  useSeedOnce(channelsQ.data, setChannels);

  const jobs = jobsQ.data ?? [];
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  async function handleSubmit() {
    if (!channelId) return toast("Wybierz kanał.", "error");
    if (isEmbedEmpty(embed)) return toast("Embed jest pusty.", "error");
    if (mode !== "now" && !toIso(runAtLocal)) {
      return toast("Podaj poprawną datę i godzinę.", "error");
    }
    setSubmitting(true);
    try {
      await createJob(guildId, {
        channelId,
        embed,
        mode,
        runAt: mode === "now" ? undefined : (toIso(runAtLocal) ?? undefined),
        recurrence: mode === "recurring" ? recurrence : undefined,
      });
      toast(
        mode === "now" ? "Ogłoszenie wysłane." : "Ogłoszenie zaplanowane.",
        "success",
      );
      if (mode !== "now") {
        qc.invalidateQueries({ queryKey: queryKeys.jobs(guildId) });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await deleteJob(guildId, id);
      qc.invalidateQueries({ queryKey: queryKeys.jobs(guildId) });
      toast("Zaplanowane ogłoszenie anulowane.", "success");
    } catch {
      toast("Nie udało się anulować.", "error");
    }
  }

  const submitLabel = mode === "now" ? "Wyślij teraz" : "Zaplanuj";

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Społeczność"
        icon={Megaphone}
        title={
          <>
            Ogło<span className="italic text-primary">szenia</span>
          </>
        }
        description="Wyślij embed teraz albo zaplanuj go (jednorazowo lub cyklicznie)."
        className="mb-0"
      />

      <HowItWorks
        subtitle="Od pomysłu do publikacji w czterech krokach"
        cards={[
          {
            icon: PenLine,
            title: "Zbuduj embed",
            text: "Ustaw tytuł, opis, kolor i pola w edytorze obok.",
          },
          {
            icon: Hash,
            title: "Wybierz kanał",
            text: "Wskaż kanał, na którym pojawi się ogłoszenie.",
          },
          {
            icon: Clock,
            title: "Wybierz tryb",
            text: "Wyślij teraz, zaplanuj na konkretny czas lub ustaw cykl.",
          },
          {
            icon: Send,
            title: "Bot publikuje",
            text: "Zaplanowane prowadzi bot — możesz je anulować na liście.",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Edytor */}
        <PanelCard title="Treść" description="Zbuduj embed i wybierz, kiedy go wysłać.">
          <ChannelField
            label="Kanał"
            value={channelId}
            onChange={setChannelId}
            channels={channels}
            onChannelsChange={setChannels}
            guildId={guildId}
            defaultName="ogloszenia"
          />

          <EmbedEditor value={embed} onChange={setEmbed} />

          {/* Tryb wysyłki */}
          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-xs text-gray-400">Kiedy wysłać</label>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

            {mode !== "now" && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    {mode === "recurring" ? "Pierwsze wysłanie" : "Data i godzina"}
                  </label>
                  <input
                    type="datetime-local"
                    value={runAtLocal}
                    onChange={(e) => setRunAtLocal(e.target.value)}
                    className="rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {mode === "recurring" && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Powtarzaj</label>
                    <Select
                      value={recurrence}
                      onValueChange={(v) => setRecurrence(v as "daily" | "weekly")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Codziennie</SelectItem>
                        <SelectItem value="weekly">Co tydzień</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? "Przetwarzanie…" : submitLabel}
            </Button>
          </div>
        </PanelCard>

        {/* Podgląd + zaplanowane */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <EmbedPreviewCard
            title="Podgląd na żywo"
            description="Tak zobaczą to członkowie"
            embed={embed}
            replace={previewReplacer}
            author={{
              name: botStatusQ.data?.username ?? "Jurassic Haven",
              avatar: botStatusQ.data?.avatar ?? null,
            }}
          />

          <div className={CARD}>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-white">Zaplanowane</p>
            </div>
            {jobsQ.isLoading ? (
              <p className="px-5 py-6 text-center text-xs text-gray-400">Ładowanie…</p>
            ) : jobs.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                Brak zaplanowanych ogłoszeń.
              </p>
            ) : (
              <div className="flex flex-col">
                {jobs.map((job, i) => (
                  <div
                    key={job.id}
                    style={{ "--i": i } as CSSProperties}
                    className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        {job.embed?.title || "(bez tytułu)"}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        #{channelName(job.channelId ?? "")} ·{" "}
                        {RECURRENCE_LABEL[job.recurrence]} · {relativeTime(job.runAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(job.id)}
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
    </div>
  );
}
