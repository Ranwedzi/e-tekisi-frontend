import type { MetadataRoute } from "next";

/** Makes e-Tekisi installable ("Add to Home screen"): its own icon, full screen, no browser bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "e-Tekisi",
    short_name: "e-Tekisi",
    description: "Book minibus taxis, pay from your wallet and track your trip.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F5F7",
    theme_color: "#FFD217",
    lang: "en-ZA",
    categories: ["travel", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
