import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ScrollTop } from "@/components/ui/scroll-top";
import { Web3Provider } from "@/components/web3-provider";
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

const TITLE = "HALON · Suppression layer for the agent economy";
const BLURB =
  "Agents insure agents. Automatic discharge on failure, cascading reinsurance recovery. Built on CROO Agent Protocol.";

/**
 * Absolute origin the `og:image` / `twitter:image` paths below resolve against.
 *
 * Without it Next resolves them against `http://localhost:3000` and every social
 * scraper gets a dead link — the card silently renders with no image. Vercel
 * injects `VERCEL_PROJECT_PRODUCTION_URL` (host only, no scheme) on deploy;
 * `NEXT_PUBLIC_SITE_URL` overrides it for a custom domain. Resolved here rather
 * than in `lib/site.ts` because that module is pulled into the client bundle,
 * where these variables are not defined.
 */
const ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: TITLE,
  description:
    "On-chain insurance and reinsurance for autonomous agents. Buy coverage before you hire. When a worker agent fails, the pool discharges automatically, and the underwriter's own cover cascades behind it.",
  keywords: [
    "HALON",
    "agent insurance",
    "reinsurance",
    "CROO Agent Protocol",
    "Base",
    "USDC",
    "A2A",
  ],
  /**
   * Declared explicitly rather than through the `app/favicon.ico` file
   * convention: the artwork lives in `public/`, next to the master lockup it
   * was cut from. Next only auto-wires icons found in `app/`.
   */
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: TITLE,
    description: BLURB,
    type: "website",
    siteName: "HALON",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HALON" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: BLURB,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
        <Web3Provider>
          {children}
        </Web3Provider>
        <ScrollTop />
      </body>
    </html>
  );
}
