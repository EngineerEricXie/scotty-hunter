import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScottyBites",
    short_name: "ScottyBites",
    description: "Personalized free-meal plans for Carnegie Mellon.",
    start_url: "/",
    display: "standalone",
    background_color: "#14261c",
    theme_color: "#d62839",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
