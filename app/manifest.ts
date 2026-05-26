import type { MetadataRoute } from "next";

// Installable PWA for the owner's Command Center. Scoped to /command so the
// public marketing site is never pulled into the installed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Command Center — All Businesses",
    short_name: "Command Center",
    description:
      "Unified live analytics and AI voice co-pilot for Text2Sale, AI Business Growth, and Trusted Quotes.",
    start_url: "/command",
    scope: "/command",
    display: "standalone",
    background_color: "#07060d",
    theme_color: "#0a0712",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      { src: "/command-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/command-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/command-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
