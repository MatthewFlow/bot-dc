interface SaveButtonProps {
  onClick: () => void;
  saving: boolean;
  saved?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SaveButton({
  onClick,
  saving,
  saved = false,
  disabled = false,
  className = "",
}: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`rounded-lg bg-[#d4a843] text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-50 ${className}`}
    >
      {saving ? "Zapisywanie..." : saved ? "Zapisano ✓" : "Zapisz zmiany"}
    </button>
  );
}
