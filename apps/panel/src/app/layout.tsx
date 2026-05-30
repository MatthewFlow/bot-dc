import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurassic Haven",
  description: "Discord bot dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f1117] text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
