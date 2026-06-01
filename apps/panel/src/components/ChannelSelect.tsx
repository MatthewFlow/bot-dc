import type { Channel } from "@/lib/api";

interface ChannelSelectProps {
  value: string;
  onChange: (value: string) => void;
  channels: Channel[];
  placeholder?: string;
  className?: string;
}

export function ChannelSelect({
  value,
  onChange,
  channels,
  placeholder = "— Wybierz kanał —",
  className = "",
}: ChannelSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg bg-[#0f1117] text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843] ${className}`}
    >
      <option value="">{placeholder}</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          # {ch.name}
        </option>
      ))}
    </select>
  );
}
