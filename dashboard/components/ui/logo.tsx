import Image from "next/image";
import markSrc from "@/public/halon-mark.png";
import { cn } from "@/lib/cn";

/**
 * The HALON mark: a suppression nozzle seen head-on, carrying the brand
 * gradient from chartreuse at the crown to mint at the outlet.
 *
 * This is `public/halon-mark.png` — cropped out of the master lockup
 * (`design/HALON.png`) and unpremultiplied against its black backdrop, so it
 * has a real alpha channel and sits cleanly on any surface.
 *
 * ── Sizing ───────────────────────────────────────────────────────────────
 * The mark is 293×449 — taller than it is wide. Size it with `h-*` and leave
 * width to `w-auto`; a square `size-*` would letterbox it inside its own box
 * and render it smaller than you asked for.
 *
 * ── Colour ───────────────────────────────────────────────────────────────
 * It no longer inherits `currentColor`. The gradient *is* the identity, so
 * `text-lime` on a parent does nothing here. Tint it with `opacity-*` instead.
 */
export function HalonMark({
  className,
  eager = false,
}: {
  className?: string;
  /**
   * Skip lazy-loading — set on above-the-fold marks (the header).
   *
   * `loading="eager"`, not `preload`: Next 16 deprecated `priority` in favour
   * of `preload`, but `preload` injects a `<link>` in `<head>` and is meant for
   * the LCP element. A 32px logo is never the LCP, and the docs say not to pair
   * `preload` with `loading` anyway.
   */
  eager?: boolean;
}) {
  return (
    <Image
      src={markSrc}
      alt=""
      aria-hidden="true"
      loading={eager ? "eager" : "lazy"}
      className={cn("h-8 w-auto shrink-0 select-none", className)}
    />
  );
}

/**
 * Mark + wordmark, set horizontally for the header and footer.
 *
 * The master lockup stacks the mark above the word and adds the tagline; that
 * shape is too tall for a nav bar, so this recomposes the same two elements on
 * one line. The word is real text, not an image, so it stays selectable and
 * scales with `font-size` — the mark tracks it via `em` units.
 */
export function HalonWordmark({
  className,
  markClassName,
  eager = false,
}: {
  className?: string;
  markClassName?: string;
  eager?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.4em] font-display text-2xl leading-none font-bold",
        "tracking-[0.02em] text-white",
        className,
      )}
    >
      <HalonMark
        eager={eager}
        className={cn("h-[1.25em] w-auto translate-y-[-0.02em]", markClassName)}
      />
      <span>HALON</span>
    </span>
  );
}
