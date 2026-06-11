import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatary i ikony serwerów z CDN Discorda — wymagane, by next/image je optymalizował.
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
