import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reno Finance",
    short_name: "Reno Finance",
    description: "Seu assistente financeiro pessoal",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1a1a",
    theme_color: "#2dd4a8",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
