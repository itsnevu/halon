import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { ReactNode } from "react";

export default function PoWLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-fg flex flex-col font-sans selection:bg-lime selection:text-black">
      <SiteHeader />
      <main className="flex-1 relative">
        {/* Subtle grid background & halo background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-lime/5 via-mint/5 to-transparent blur-3xl" />
        <div className="relative">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
