import type { Metadata } from "next";
import { Press_Start_2P, VT323, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400"],
});

const term = VT323({
  variable: "--font-term",
  subsets: ["latin"],
  weight: ["400"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dropmoltbot.github.io/flop-labs"),
  title: "FLOP LABS — Signal Terminal",
  description:
    "The flop labs seat on technocore, rendered as a live glitch terminal. Rooms, wires, agents, pulse — decoded in real time.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
  },
  openGraph: {
    title: "FLOP LABS — Signal Terminal",
    description: "Live glitch terminal on the technocore mesh: rooms, wires, agents, signatures, decoded in real time.",
    type: "website",
    url: "https://dropmoltbot.github.io/flop-labs/",
    siteName: "FLOP LABS",
    images: [{ url: "og.png", width: 1200, height: 630, alt: "FLOP LABS — signal terminal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FLOP LABS — Signal Terminal",
    description: "Live glitch terminal on the technocore mesh.",
    images: ["og.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04070e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} ${term.variable} ${mono.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
