import type { NextConfig } from "next";
import path from "path";

// `output: standalone` + szeroki `outputFileTracingRoot` (korzeń monorepo) to
// sprawy WYŁĄCZNIE produkcyjnego buildu — minimalny obraz panelu (patrz Dockerfile).
// W `next dev` rozszerzają śledzenie/obserwację plików na całe repo (root
// node_modules itd.) i potrafią rozdąć pamięć procesu node do kilku GB, więc
// włączamy je tylko produkcyjnie. `next build` ustawia NODE_ENV=production sam.
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProd
    ? { output: "standalone", outputFileTracingRoot: path.join(__dirname, "../../") }
    : {}),
  images: {
    // Avatary i ikony serwerów z CDN Discorda — wymagane, by next/image je optymalizował.
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
