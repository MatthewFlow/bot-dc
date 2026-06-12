import { EntitySelect } from "@/components/EntitySelect";
import type { Channel } from "@/lib/api";

export function ChannelSelect({
  value,
  onChange,
  channels,
  placeholder = "— Wybierz kanał —",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  channels: Channel[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <EntitySelect
      value={value}
      onChange={onChange}
      items={channels}
      placeholder={placeholder}
      className={className}
      renderLabel={(ch) => `# ${ch.name}`}
    />
  );
}
