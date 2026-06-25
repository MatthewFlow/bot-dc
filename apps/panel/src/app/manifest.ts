import type { MetadataRoute } from "next";

/**
 * Manifest PWA — Next auto-dodaje <link rel="manifest"> i serwuje pod
 * /manifest.webmanifest. Czyni panel instalowalnym ("Dodaj do ekranu głównego")
 * z własną ikoną i kolorami brandu. Ikony PNG leżą w public/ (+ apple-icon w app/).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jurassic Haven",
    short_name: "Jurassic Haven",
    description: "Panel zarządzania botem Discord — Jurassic Haven.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
