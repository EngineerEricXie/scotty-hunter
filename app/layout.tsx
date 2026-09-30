import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScottyBites · Find your next free bite",
  description:
    "A playful campus food companion for Carnegie Mellon. Explore sample food events, build a walking-friendly meal plan, and bring Scotty along.",
  applicationName: "ScottyBites",
  appleWebApp: {
    capable: true,
    title: "ScottyBites",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
