import "./globals.css";

import type { Metadata } from "next";

import { QueryProvider } from "@/components/QueryProvider";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Jurassic Haven",
  description: "Discord bot dashboard",
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
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
