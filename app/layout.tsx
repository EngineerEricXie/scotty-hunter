import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const hud = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hud",
  display: "swap",
});

const pixel = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScottyBites",
  description:
    "Personalized free-meal plans for Carnegie Mellon. Grounded extraction, deterministic ranking.",
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
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#14261c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${hud.variable} ${pixel.variable} min-h-dvh bg-canvas text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
