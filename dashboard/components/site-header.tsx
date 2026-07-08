"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { HalonWordmark } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { NAV, SITE } from "@/lib/site";

/**
 * Two hairlines that fold into an X. Transform lives inline because Tailwind
 * composes `translate-y` / `rotate` into shared custom properties, and the
 * open/closed pair would fight over them.
 */
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block size-[18px]">
      <span
        className="absolute top-1/2 left-0 block h-px w-[18px] bg-current transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateY(-0.5px) rotate(45deg)" : "translateY(-3.5px)" }}
      />
      <span
        className="absolute top-1/2 left-0 block h-px w-[18px] bg-current transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateY(-0.5px) rotate(-45deg)" : "translateY(2.5px)" }}
      />
    </span>
  );
}

const triggerClass =
  "grid size-10 shrink-0 place-items-center rounded-full border border-line " +
  "bg-white/[0.03] text-white transition-colors duration-200 hover:border-lime/40 hover:bg-white/[0.06]";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Header goes opaque once the hero has moved. rAF-throttled. */
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* Drawer: lock scroll, focus close, honour Escape, bail out at lg. */
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  return (
    <>
      <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="pointer-events-auto relative isolate mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full px-4 sm:px-6 md:h-16">
          {/* The pill lives on its own layer so the blur, the border and the cast
              shadow all arrive together on a single opacity transition. A filter
              cannot be transitioned into existence, but the layer carrying it can
              be faded in. At rest this paints nothing: no border, no blur, no bg.
              `isolate` on the parent keeps `-z-10` from falling behind the page. */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-full border border-line bg-ink/70",
              "shadow-[0_20px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl",
              "transition-opacity duration-500 ease-out",
              scrolled ? "opacity-100" : "opacity-0",
            )}
          />
          {/* left */}
          <div className="flex items-center gap-3">
            <a
              href="#top"
              aria-label="HALON home"
              className="rounded-sm transition-opacity duration-200 hover:opacity-80"
            >
              <HalonWordmark eager className="text-[1.375rem] md:text-2xl" />
            </a>
          </div>

          {/* center */}
          <nav
            aria-label="Primary"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group relative py-1 text-sm text-mist transition-colors duration-200 hover:text-white"
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-lime",
                    "transition-transform duration-300 ease-out",
                    "group-hover:scale-x-100 group-focus-visible:scale-x-100",
                  )}
                />
              </a>
            ))}
          </nav>

          {/* right */}
          <div className="hidden items-center gap-2.5 lg:flex">
            <ButtonLink
              variant="ghost"
              size="sm"
              href={SITE.docs}
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </ButtonLink>
            <ButtonLink variant="primary" size="sm" href="#quote">
              Get a quote
            </ButtonLink>
          </div>

          <button
            type="button"
            // A real toggle. It reports `aria-expanded`, so it has to be able to
            // collapse what it expanded — `setOpen(true)` left it announcing
            // "expanded" under the label "Open menu", doing nothing when pressed.
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            className={cn(triggerClass, "lg:hidden")}
          >
            <MenuGlyph open={open} />
          </button>
        </div>
      </header>

      {/* Sibling of <header> on purpose: backdrop-blur creates a containing
          block, so a fixed drawer nested inside would be clipped to it. */}
      {open && (
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-2xl lg:hidden"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

          <div className="relative mx-auto flex h-16 w-full max-w-7xl shrink-0 items-center justify-between px-5 sm:px-8 md:h-[4.5rem]">
            <HalonWordmark className="text-[1.375rem] md:text-2xl" />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              aria-expanded={open}
              aria-controls="site-menu"
              className={triggerClass}
            >
              <MenuGlyph open />
            </button>
          </div>

          <nav
            aria-label="Primary"
            className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-1 overflow-y-auto px-5 sm:px-8"
          >
            {NAV.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="animate-rise w-fit py-2 font-display text-3xl font-semibold tracking-[-0.03em] text-white transition-colors duration-200 hover:text-lime"
                style={{ animationDelay: `${40 + i * 55}ms` }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="relative mx-auto flex w-full max-w-7xl shrink-0 flex-col gap-3 border-t border-line px-5 pt-6 pb-8 sm:px-8">
            <ButtonLink
              variant="ghost"
              size="lg"
              href={SITE.docs}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Docs
            </ButtonLink>
            <ButtonLink
              variant="primary"
              size="lg"
              href="#quote"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Get a quote
            </ButtonLink>
          </div>
        </div>
      )}
    </>
  );
}
