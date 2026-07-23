"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

/**
 * Flips the site between light and dark by toggling the `.dark` class on
 * <html>. Where the View Transitions API is available it wipes the new theme
 * in as a circle expanding from the button; otherwise it swaps instantly.
 * The choice is persisted to localStorage (read back in app/layout.tsx).
 */
export function AnimatedThemeToggler({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const apply = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
    try {
      localStorage.setItem("halon:theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const toggle = async () => {
    const next = !document.documentElement.classList.contains("dark");
    const startViewTransition = (document as ViewTransitionDoc).startViewTransition;

    if (typeof startViewTransition !== "function") {
      apply(next);
      return;
    }

    await startViewTransition.call(document, () => {
      flushSync(() => apply(next));
    }).ready;

    const btn = ref.current;
    if (!btn) return;
    const { top, left, width, height } = btn.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top),
    );
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 550,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      } as KeyframeAnimationOptions,
    );
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-mist transition-colors hover:border-lime/40 hover:text-fg",
        className,
      )}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      )}
    </button>
  );
}
