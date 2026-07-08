import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/cn";

/**
 * A decorative render bled into a section's background.
 *
 * ── Why `mix-blend-screen` and not an alpha channel ───────────────────────
 * Every one of these renders is glowing line-work on pure black. `screen`
 * composites as `1 - (1 - backdrop)(1 - source)`, so a black source pixel
 * returns the backdrop untouched and a bright one adds light. The black
 * rectangle simply stops existing — no keying, no matte, no halo on the
 * anti-aliased edges. It only works because the canvas underneath is dark;
 * on a light surface these would turn into grey slabs.
 *
 * The wrapper owns position, size and opacity (pass them in `className`); the
 * `Image` just fills it. `fill` needs a positioned parent, which the wrapper
 * always is.
 *
 * Art is never content: it is `aria-hidden`, `pointer-events-none`, and lazy.
 * It also renders *before* the section's content in the DOM, and both are
 * positioned, so the content paints over it without needing a z-index.
 */
export function SectionArt({
  src,
  className,
  contain = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  src: StaticImageData;
  /** Position, size and opacity all live here. */
  className?: string;
  /** `contain` for a whole object; the default `cover` for a bled texture. */
  contain?: boolean;
  sizes?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute mix-blend-screen select-none", className)}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className={contain ? "object-contain" : "object-cover"}
      />
    </div>
  );
}
