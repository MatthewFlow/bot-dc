import "./globals.css";

import type { Metadata, Viewport } from "next";

import { QueryProvider } from "@/components/QueryProvider";
import { TiltProvider } from "@/components/TiltProvider";
import { ToastProvider } from "@/components/Toast";
import { WebVitals } from "@/components/WebVitals";

export const metadata: Metadata = {
  title: "Jurassic Haven",
  description: "Discord bot dashboard",
  applicationName: "Jurassic Haven",
  // Instalacja jako aplikacja na iOS (Dodaj do ekranu głównego) — własny tytuł i
  // przezroczysty pasek statusu pod treścią (współgra z viewportFit: cover).
  appleWebApp: {
    capable: true,
    title: "Jurassic Haven",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
  // Rozciąga treść pod notch/zaokrąglenia; safe-area-inset-* w CSS pilnuje marginesów.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: rozszerzenia przeglądarki (np. Grammarly) wstrzykują
          atrybuty na <body> przed hydracją — tłumimy tylko ten jeden poziom, realne
          mismatchy w drzewie nadal są raportowane. */}
      <body
        suppressHydrationWarning
        className="bg-background text-white min-h-screen antialiased"
      >
        <WebVitals />
        <TiltProvider />
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
