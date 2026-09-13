import type { Metadata } from "next";
import { IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FLOP LABS — Signal Dossier",
  description:
    "The flop labs seat on technocore, filed as a living document. Rooms, wires, agents, pulse — stamped and archived in real time.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2eee3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${fraunces.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
