import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScottyBites",
  description:
    "Never miss free food at CMU. Discover campus events, verify food evidence, and plan a free-meal itinerary.",
  applicationName: "ScottyBites",
  appleWebApp: {
    capable: true,
    title: "ScottyBites",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#e8edf2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
