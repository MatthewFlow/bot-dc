import type { Dispatch, ReactNode, SetStateAction } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import type { Channel } from "@/lib/api";

/**
 * Pole wyboru kanału z przyciskiem „utwórz" — wspólny wzorzec powtarzany na wielu
 * stronach. Utworzenie kanału dopisuje go do (posortowanej) listy i od razu zaznacza.
 */
export function ChannelField({
  label,
  value,
  onChange,
  channels,
  onChannelsChange,
  guildId,
  defaultName,
  placeholder = "— Wybierz kanał —",
  hint,
  className = "",
}: {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  channels: Channel[];
  onChannelsChange: Dispatch<SetStateAction<Channel[]>>;
  guildId: string;
  defaultName: string;
  placeholder?: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="mb-1 block text-xs text-gray-400">{label}</label>}
      <div className="flex flex-wrap items-center gap-2">
        <ChannelSelect
          value={value}
          onChange={onChange}
          channels={channels}
          placeholder={placeholder}
          className="min-w-0 flex-1 px-3 py-2.5"
        />
        <CreateChannelButton
          guildId={guildId}
          defaultName={defaultName}
          onCreated={(ch) => {
            onChannelsChange((prev) =>
              [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
            );
            onChange(ch.id);
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
