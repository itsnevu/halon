import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HALON — Suppression layer for the agent economy",
  description:
    "On-chain insurance and reinsurance for autonomous agents. Buy coverage before you hire. When a worker agent fails, the pool discharges automatically — and the underwriter's own cover cascades behind it.",
  keywords: [
    "HALON",
    "agent insurance",
    "reinsurance",
    "CROO Agent Protocol",
    "Base",
    "USDC",
    "A2A",
  ],
  openGraph: {
    title: "HALON — Suppression layer for the agent economy",
    description:
      "Agents insure agents. Automatic discharge on failure, cascading reinsurance recovery. Built on CROO Agent Protocol.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050705",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink">
        {/* Scroll-reveal is progressive enhancement: without JS, show everything. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;animation:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
