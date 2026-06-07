import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/api";

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  roles: Role[];
  placeholder?: string;
  className?: string;
}

/** Sentinel dla opcji „wyczyść" — Radix Select nie dopuszcza pustej wartości. */
const NONE = "__none__";

export function RoleSelect({
  value,
  onChange,
  roles,
  placeholder = "— Wybierz rolę —",
  className = "",
}: RoleSelectProps) {
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
        {roles.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
