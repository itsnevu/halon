"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { HalonWordmark } from "@/components/ui/logo";
import { ConnectKitButton } from "connectkit";
import { signIn, signOut, useSession } from "next-auth/react";
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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prefsRef = useRef<HTMLDivElement>(null);
  
  const { data: session, status } = useSession();

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

  /* Close preferences dropdown on outside click */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prefsRef.current && !prefsRef.current.contains(event.target as Node)) {
        setPrefsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
              "pointer-events-none absolute inset-0 -z-10 rounded-full neu shadow-[0_20px_60px_-24px_rgba(0,0,0,0.95)]",
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
              <HalonWordmark className="h-6 w-auto text-white" />
            </a>
          </div>

          {/* center */}
          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center justify-center gap-7 lg:flex"
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
            
            {/* SEARCH BAR */}
            <div className="relative group mr-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-mist group-focus-within:text-lime transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input 
                type="text" 
                placeholder="Search tokens, pools..."
                className="bg-surface-2 border border-line text-white text-sm rounded-full pl-9 pr-10 py-2 w-[240px] outline-none focus:border-lime/40 focus:bg-surface-3 transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs bg-surface-3 text-mist px-1.5 py-0.5 rounded border border-line">/</span>
              </div>
            </div>

            {/* PREFERENCES MENU */}
            <div className="relative" ref={prefsRef}>
              <button 
                onClick={() => setPrefsOpen(!prefsOpen)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-full transition-colors border",
                  prefsOpen ? "bg-surface-3 border-lime/30 text-white" : "bg-surface-2 border-line text-mist hover:bg-surface-3 hover:text-white"
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
              </button>

              {prefsOpen && (
                <div className="absolute right-0 top-12 w-[320px] bg-[#131313] border border-[#2B2B2B] rounded-2xl shadow-2xl p-2 z-50 animate-fade-in origin-top-right">
                  <div className="px-3 py-3 text-white font-medium mb-1">Global preferences</div>
                  
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group">
                    <span className="text-mist group-hover:text-white transition-colors">Theme</span>
                    <div className="flex bg-[#1E1E1E] rounded-full p-1 border border-[#2B2B2B]">
                      <button className="px-3 py-1 bg-[#2B2B2B] text-white text-xs font-medium rounded-full">Auto</button>
                      <button className="px-3 py-1 text-mist hover:text-white text-xs font-medium rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                      </button>
                      <button className="px-3 py-1 text-mist hover:text-white text-xs font-medium rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group mt-1">
                    <span className="text-mist group-hover:text-white transition-colors">Language</span>
                    <div className="flex items-center gap-1 text-white font-medium text-sm">
                      English
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mist"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group mt-1">
                    <span className="text-mist group-hover:text-white transition-colors">Currency</span>
                    <div className="flex items-center gap-1 text-white font-medium text-sm">
                      USD
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mist"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="flex items-center pl-1">
              <ConnectKitButton />
            </div>
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
            <HalonWordmark className="h-6 w-auto text-white" />
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
            <div className="w-full flex justify-center gap-4 mt-2">
              {status !== "authenticated" ? (
                <button 
                  onClick={() => signIn("google")}
                  className="h-10 px-6 w-full inline-flex items-center justify-center rounded-full bg-lime text-sm font-medium text-black transition-colors hover:bg-lime/90"
                >
                  Sign In
                </button>
              ) : (
                <button 
                  onClick={() => signOut()}
                  className="h-10 px-6 w-full inline-flex items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-medium text-white transition-colors hover:bg-surface-3"
                >
                  Sign Out
                </button>
              )}
              <div className="flex items-center">
                <ConnectKitButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
