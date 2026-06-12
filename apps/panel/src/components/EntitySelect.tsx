import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentinel dla opcji „wyczyść" — Radix Select nie dopuszcza pustej wartości. */
const NONE = "__none__";

/**
 * Bazowy select encji `{ id, name }` z opcją „wyczyść". Wspólny rdzeń pod
 * ChannelSelect/RoleSelect — różnią się tylko danymi i etykietą pozycji.
 */
export function EntitySelect<T extends { id: string; name: string }>({
  value,
  onChange,
  items,
  placeholder,
  className = "",
  renderLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  items: T[];
  placeholder: string;
  className?: string;
  /** Etykieta pozycji — domyślnie `item.name` (np. dla kanałów: `# {name}`). */
  renderLabel?: (item: T) => ReactNode;
}) {
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
        {items.map((it) => (
          <SelectItem key={it.id} value={it.id}>
            {renderLabel ? renderLabel(it) : it.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
