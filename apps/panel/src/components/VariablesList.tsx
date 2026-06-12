/**
 * Lista „Dostępne zmienne": nazwa zmiennej (mono) + opis. Wspólna dla stron z
 * edytorem embeda (welcome, tickety, …). Każda strona mapuje swoje dane na `items`.
 */
export function VariablesList({
  items,
  title = "Dostępne zmienne",
  className = "",
}: {
  items: { label: string; desc: string }[];
  title?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs text-gray-400">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((v) => (
          <div key={v.label} className="flex items-center gap-3">
            <span className="w-32 font-mono text-xs text-primary">{v.label}</span>
            <span className="text-xs text-gray-300">{v.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
