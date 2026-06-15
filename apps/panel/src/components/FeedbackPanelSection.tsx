import type { Dispatch, SetStateAction } from "react";

import { ChannelField } from "@/components/ChannelField";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { PanelCard } from "@/components/PanelCard";
import { Button } from "@/components/ui/button";
import { VariablesCard } from "@/components/VariablesCard";
import type { Channel, EmbedConfig, GuildConfig } from "@/lib/api";
import { TICKET_VARS } from "@/lib/embed";

/** Zmienne dostępne w panelu feedbacku (kontekst serwera — `TICKET_VARS`). */
const PANEL_VARIABLES = [
  { label: "{server}", desc: "Nazwa serwera" },
  { label: "{member_count}", desc: "Liczba członków" },
];

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

        <VariablesCard items={PANEL_VARIABLES} />
      </div>
    </div>
  );
}
