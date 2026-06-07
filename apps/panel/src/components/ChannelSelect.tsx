import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Channel } from "@/lib/api";

interface ChannelSelectProps {
  value: string;
  onChange: (value: string) => void;
  channels: Channel[];
  placeholder?: string;
  className?: string;
}

/** Sentinel dla opcji „wyczyść" — Radix Select nie dopuszcza pustej wartości. */
const NONE = "__none__";

export function ChannelSelect({
  value,
  onChange,
  channels,
  placeholder = "— Wybierz kanał —",
  className = "",
}: ChannelSelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {channels.map((ch) => (
          <SelectItem key={ch.id} value={ch.id}>
            # {ch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
