import type { Role } from "@/lib/api";

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  roles: Role[];
  placeholder?: string;
  className?: string;
}

export function RoleSelect({
  value,
  onChange,
  roles,
  placeholder = "— Wybierz rolę —",
  className = "",
}: RoleSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg bg-[#0f1117] text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843] ${className}`}
    >
      <option value="">{placeholder}</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
