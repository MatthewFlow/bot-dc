import { EntitySelect } from "@/components/EntitySelect";
import type { Role } from "@/lib/api";

export function RoleSelect({
  value,
  onChange,
  roles,
  placeholder = "— Wybierz rolę —",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  roles: Role[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <EntitySelect
      value={value}
      onChange={onChange}
      items={roles}
      placeholder={placeholder}
      className={className}
    />
  );
}
