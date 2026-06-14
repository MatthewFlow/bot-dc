import { Sparkles, Zap } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { ChannelField } from "@/components/ChannelField";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { PanelCard } from "@/components/PanelCard";
import { Button } from "@/components/ui/button";
import type { Channel, EmbedConfig, GuildConfig } from "@/lib/api";
import { TICKET_VARS } from "@/lib/embed";

const CARD = "surface-raised rounded-xl border border-border bg-card";

export const DEFAULT_FEEDBACK_PANEL_EMBED: EmbedConfig = {
  title: "💡 Podziel się opinią",
  description:
    "Masz pomysł, uwagę albo znalazłeś błąd? Kliknij przycisk poniżej i napisz nam — " +
    "Twoja opinia trafi prosto do ekipy.",
  color: 0xd4a843,
};

interface FeedbackPanelSectionProps {
  guildId: string;
  config: GuildConfig;
  setConfig: Dispatch<SetStateAction<GuildConfig>>;
  channels: Channel[];
  setChannels: Dispatch<SetStateAction<Channel[]>>;
  sendingPanel: boolean;
  onSendPanel: () => void;
  botName: string;
  botAvatar: string | null;
}

/**
 * Sekcja konfiguracji panelu feedbacku (edytor embeda + podgląd + wskazówki). Wydzielona
 * i ładowana leniwie (`next/dynamic`) z poziomu strony feedbacku — ciężki EmbedEditor/
 * podgląd schodzą z initial bundle, bo to treść „pod foldem" tylko dla admina.
 */
export function FeedbackPanelSection({
  guildId,
  config,
  setConfig,
  channels,
  setChannels,
  sendingPanel,
  onSendPanel,
  botName,
  botAvatar,
}: FeedbackPanelSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <PanelCard
        title="Panel feedbacku"
        description="Embed z przyciskiem „Podziel się opinią” wysyłany na kanał, by każdy mógł zgłaszać opinie z Discorda."
      >
        <ChannelField
          label="Kanał feedbacku"
          value={config.feedbackChannelId ?? ""}
          onChange={(v) =>
            setConfig((c) => ({ ...c, feedbackChannelId: v || undefined }))
          }
          channels={channels}
          onChannelsChange={setChannels}
          guildId={guildId}
          defaultName="feedback"
          placeholder="— Nie ustawiono —"
          hint={
            <>
              Tu trafiają zgłoszenia z komendy <code>/feedback</code> oraz panel z
              przyciskiem.
            </>
          }
        />

        <EmbedEditor
          value={config.feedbackPanelEmbed ?? DEFAULT_FEEDBACK_PANEL_EMBED}
          onChange={(embed) => setConfig((c) => ({ ...c, feedbackPanelEmbed: embed }))}
          variables={TICKET_VARS}
        />

        <div className="border-t border-border pt-4">
          <Button
            onClick={onSendPanel}
            disabled={sendingPanel || !config.feedbackChannelId}
            className="w-full"
          >
            {sendingPanel ? "Publikowanie…" : "Opublikuj"}
          </Button>
          {!config.feedbackChannelId && (
            <p className="mt-2 text-xs text-gray-400">
              Najpierw ustaw kanał feedbacku powyżej i zapisz.
            </p>
          )}
        </div>
      </PanelCard>

      <div className="flex flex-col gap-6 lg:sticky lg:top-20">
        <EmbedPreviewCard
          title="Podgląd na żywo"
          description="Tak zobaczą to członkowie"
          author={{ name: botName, avatar: botAvatar }}
          buttonLabel="Podziel się opinią"
          buttonEmoji="💡"
          embed={config.feedbackPanelEmbed ?? DEFAULT_FEEDBACK_PANEL_EMBED}
        />

        {/* Wskazówki */}
        <div className={`${CARD} p-5`}>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles size={16} className="shrink-0 text-primary" />
            Wskazówki
          </p>
          <ul className="flex flex-col gap-2.5 text-xs leading-snug text-gray-300">
            <li className="flex gap-2">
              <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                Użyj zmiennych <code>{"{server}"}</code> i <code>{"{member_count}"}</code>
                , by spersonalizować opis.
              </span>
            </li>
            <li className="flex gap-2">
              <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                Kolor embeda dopasuj do akcentu serwera — bursztyn buduje spójność marki.
              </span>
            </li>
            <li className="flex gap-2">
              <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                Podgląd aktualizuje się na żywo — zobacz efekt przed publikacją.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
