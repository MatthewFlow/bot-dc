"use client";

import { toast as sonnerToast, Toaster } from "sonner";

export type ToastType = "success" | "error" | "warning";

/**
 * Cienka nakładka na `sonner` zachowująca dotychczasowe API panelu
 * (`useToast()` → `(message, type?) => void`, `<ToastProvider>`), żeby
 * call-site'y nie wymagały zmian. Sonner dokłada animacje wejścia/wyjścia,
 * stackowanie i swipe-to-dismiss; styl dopasowany do ciemnego motywu marki.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        closeButton
        toastOptions={{
          classNames: {
            toast: "!bg-card !border !border-border !text-white !shadow-popover",
            title: "!text-sm !text-white",
            description: "!text-gray-300",
            success: "!border-l-4 !border-l-success",
            error: "!border-l-4 !border-l-destructive",
            warning: "!border-l-4 !border-l-primary",
            closeButton: "!bg-elevated !border-border !text-gray-300",
          },
        }}
      />
    </>
  );
}

/** Stabilna referencja — bezpieczna w tablicach zależności i domknięciach. */
function showToast(message: string, type: ToastType = "success"): void {
  sonnerToast[type](message);
}

export function useToast() {
  return showToast;
}
