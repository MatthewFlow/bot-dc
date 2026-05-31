"use client";

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Usuń",
  cancelLabel = "Anuluj",
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-[#1a1f2e] p-6 shadow-xl animate-[toast-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-white">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg bg-[#0f1117] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#252b3d]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[#ED4245] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c93a3d]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
