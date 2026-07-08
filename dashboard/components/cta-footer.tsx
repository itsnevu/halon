import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import Image from "next/image";
import { HalonWordmark } from "@/components/ui/logo";
import artProtocolCore from "@/public/art-protocol-core.png";
import { basescanAddr, shortAddr } from "@/lib/format";
import { NAV, SDK_METHODS, SITE } from "@/lib/site";

/* ── inline icons ─────────────────────────────────────────────── */

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M9 1.75H4.5A1.25 1.25 0 0 0 3.25 3v10a1.25 1.25 0 0 0 1.25 1.25h7A1.25 1.25 0 0 0 12.75 13V5.5z" />
      <path d="M9 1.75V5.5h3.75" />
      <path d="M5.75 8.5h4.5M5.75 11h3" />
    </svg>
  );
}

/* ── CTA band ─────────────────────────────────────────────────── */

export function CtaBand() {
  return (
    <section className="noise relative overflow-hidden bg-ink px-5 py-24 sm:px-8 sm:py-32">
      {/* grid, fading out toward the bottom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-bg mask-fade-b opacity-40" />
      {/* the discharge glow, sitting under the type */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 size-[520px] -translate-x-1/2 translate-y-1/3 rounded-full brand-grad opacity-[0.15] blur-[140px]"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* The mark, on its pedestal, with the protocol laid out around it. This
            render already contains the shield, so it stands in for the bare mark
            rather than sitting behind it. `mix-blend-screen` dissolves its black
            backdrop into the band. It bobs; it does not spin. */}
        <Image
          src={artProtocolCore}
          alt=""
          aria-hidden="true"
          className="mx-auto block h-48 w-auto animate-float select-none mix-blend-screen sm:h-64"
        />

        <h2 className="mt-8 font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.05] text-balance text-white">
          Your agent is one bad order away from being{" "}
          <span className="text-gradient">uninsurable</span>.
        </h2>

        <p className="mt-6 text-lg text-pretty text-mist">
          Bind cover before you hire. Or write cover and get paid for other agents&rsquo;
          reliability. Both sides of this market are open.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink variant="primary" size="lg" arrow href="#quote">
            Get a quote
          </ButtonLink>
          <ButtonLink
            variant="ghost"
            size="lg"
            href={SITE.agentStore}
            target="_blank"
            rel="noreferrer"
          >
            List your agent
          </ButtonLink>
        </div>

      </div>
    </section>
  );
}

/* ── footer ───────────────────────────────────────────────────── */

const headingClass = "font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white mb-4";
const linkClass = "text-sm text-mist-dim transition-colors hover:text-white";

const BUILD_LINKS = [
  { label: "CROO Agent Store", href: SITE.agentStore, external: true },
  { label: "CAP docs", href: SITE.docs, external: true },
  { label: "GitHub", href: SITE.github, external: true },
  { label: "Design doc", href: "#", external: false },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-2 px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* brand */}
          <div>
            <HalonWordmark />
            <p className="mt-4 max-w-xs text-sm text-mist">{SITE.tagline}</p>
            <p className="mt-3 font-mono text-[0.6875rem] text-mist-dim italic">{SITE.metaphor}</p>

            <div className="mt-6 flex items-center gap-4">
              <a
                href={SITE.github}
                target="_blank"
                rel="noreferrer"
                aria-label="HALON on GitHub"
                className="text-mist-dim transition-colors hover:text-lime"
              >
                <GithubIcon />
              </a>
              <a
                href={SITE.docs}
                target="_blank"
                rel="noreferrer"
                aria-label="CROO Agent Protocol documentation"
                className="text-mist-dim transition-colors hover:text-lime"
              >
                <DocsIcon />
              </a>
            </div>
          </div>

          {/* protocol */}
          <nav aria-label="Protocol">
            <h2 className={headingClass}>Protocol</h2>
            <ul className="space-y-2.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* build */}
          <nav aria-label="Build">
            <h2 className={headingClass}>Build</h2>
            <ul className="space-y-2.5">
              {BUILD_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className={linkClass}
                    {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* sdk surface */}
          <div>
            <h2 className={headingClass}>SDK surface</h2>
            <div className="flex flex-wrap gap-1.5">
              {SDK_METHODS.map((method) => (
                <span
                  key={method}
                  className="rounded border border-line bg-white/[0.02] px-2 py-1 font-mono text-[0.625rem] text-mist-dim"
                >
                  {method}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[0.6875rem] text-mist-dim">Nine methods. No forks, no shims.</p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row">
          <p className="text-xs text-mist-dim">© 2026 HALON. MIT licensed.</p>

          <a
            href={basescanAddr(SITE.usdc)}
            target="_blank"
            rel="noreferrer"
            className="tabular font-mono text-xs text-mist-dim transition-colors hover:text-lime"
          >
            USDC {shortAddr(SITE.usdc)}
          </a>

          <Badge tone="lime" dot>
            Armed
          </Badge>
        </div>

        {/* oversized wordmark, bleeding off the bottom edge.
            -mb-16 cancels the footer's pb-16 so the glyphs meet the border,
            and leading-[0.8] pushes them past it — overflow-hidden clips. */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-16 -mb-16 text-center leading-[0.8] font-display text-[clamp(4rem,17vw,15rem)] font-bold tracking-[-0.05em] whitespace-nowrap text-white/[0.035] select-none"
        >
          HALON
        </div>
      </div>
    </footer>
  );
}
