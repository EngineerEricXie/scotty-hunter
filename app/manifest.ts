import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScottyBites",
    short_name: "ScottyBites",
    description: "Never miss free food at CMU.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8edf2",
    theme_color: "#c41230",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
