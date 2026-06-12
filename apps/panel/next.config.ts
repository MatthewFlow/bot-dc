import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Minimalny serwer produkcyjny: Next pakuje do `.next/standalone` tylko realnie
  // używane pliki + okrojone node_modules. Obraz panelu jedzie na tym zamiast
  // ciągnąć cały monorepo (patrz Dockerfile).
  output: "standalone",
  // Monorepo: korzeń do śledzenia plików standalone to katalog repo, nie apps/panel.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    // Avatary i ikony serwerów z CDN Discorda — wymagane, by next/image je optymalizował.
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
