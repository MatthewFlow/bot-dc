"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastType = "success" | "error" | "warning";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

const STYLES: Record<ToastType, { border: string; icon: string; iconColor: string }> = {
  success: { border: "border-l-success", icon: "✓", iconColor: "text-success" },
  error: { border: "border-l-destructive", icon: "✕", iconColor: "text-destructive" },
  warning: { border: "border-l-primary", icon: "!", iconColor: "text-primary" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => {
          const style = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-80 items-center gap-3 rounded-lg border border-border border-l-4 ${style.border} bg-card px-4 py-3 shadow-popover animate-[toast-in_0.2s_ease-out]`}
            >
              <span className={`text-sm font-bold ${style.iconColor}`}>{style.icon}</span>
              <span className="flex-1 text-sm text-white">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 transition hover:text-white"
                aria-label="Zamknij"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
