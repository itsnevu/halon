"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Back-to-top affordance. Fades in once the hero is comfortably behind you.
 *
 * The scroll itself is left to `window.scrollTo({ top: 0 })` with no `behavior`:
 * `html { scroll-behavior: smooth }` in `globals.css` already smooths it, and the
 * `prefers-reduced-motion` block there already forces it back to `auto`. Passing
 * `behavior: "smooth"` here would override both and animate for readers who asked
 * us not to.
 *
 * The fade lives on the wrapper rather than the button because `.neu-raise` owns
 * the button's `transition` shorthand — a `transition-opacity` on the same node
 * would replace its `transform`/`box-shadow` transitions, and the hover lift
 * would snap.
 */
export function ScrollTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed right-5 bottom-5 z-40 transition-opacity duration-300 sm:right-8 sm:bottom-8",
        shown ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Back to top"
        // Hidden from the a11y tree while invisible — a focusable ghost is worse
        // than no button at all.
        tabIndex={shown ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0 })}
        className="neu neu-raise grid size-11 cursor-pointer place-items-center rounded-full border border-line text-mist hover:border-lime/40 hover:text-white"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
          <path
            d="M8 13V3m0 0L3.5 7.5M8 3l4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
