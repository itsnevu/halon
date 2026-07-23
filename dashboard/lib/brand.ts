/**
 * HALON brand palette — sampled directly from `design/HALON.png`.
 *
 * The mark is a single vertical gradient: chartreuse at the crown, mint at the
 * nozzle. Every accent in the product is a point on that ramp, which is why
 * these three constants exist rather than a bag of hand-picked greens.
 *
 * Sampled means sampled: the values below are the mean chromatic pixel of the
 * top, middle, and bottom bands of the mark. If the logo is ever redrawn,
 * re-sample — do not eyeball.
 *
 * These mirror the `--color-lime / --color-spring / --color-mint` tokens in
 * `app/globals.css`. CSS owns the styling; this module exists because SVG
 * `stroke`/`fill` and canvas gradients cannot read Tailwind tokens.
 */

/** Crown of the mark. The primary accent. */
export const LIME = "#c8e63c";
/** Waist of the mark. Use where lime and mint must meet. */
export const SPRING = "#bae95e";
/** Nozzle of the mark. The secondary accent — always the *end* of a ramp. */
export const MINT = "#61e7c3";

/** Failure states. Never a gradient — red is a stop sign, not a mood. */
export const DANGER = "#ff5f56";

/**
 * The brand ramp, as SVG gradient stops. Angle is caller's business.
 * Ordered crown → nozzle so a top-to-bottom gradient reads like the logo.
 */
export const BRAND_STOPS = [
  { offset: "0%", color: LIME },
  { offset: "45%", color: SPRING },
  { offset: "100%", color: MINT },
] as const;

/** `linear-gradient(...)` string for inline styles that cannot use a class. */
export const BRAND_GRADIENT = `linear-gradient(155deg, ${LIME} 0%, ${SPRING} 45%, ${MINT} 100%)`;

/** rgba() of the primary accent — for glows and hairlines built in JS. */
export function limeAlpha(a: number): string {
  return `rgba(200, 230, 60, ${a})`;
}
/** rgba() of the secondary accent. */
export function mintAlpha(a: number): string {
  return `rgba(97, 231, 195, ${a})`;
}

/* ── Chrome ───────────────────────────────────────────────────────────────
   Not brand colours, but they share the brand colours' problem: an SVG
   `stroke`/`fill`, or a `linear-gradient()` assembled in JS, cannot read a
   Tailwind token. A chart that wants the page's own hairline has to hardcode
   it. Hardcoding it *here* means one file drifts when the theme moves instead
   of six. Mirrors `--color-ink / --color-surface / --color-line / …`.
   ─────────────────────────────────────────────────────────────────────── */

/* These now resolve to the page's own CSS tokens (via `var()`) so they flip
   with the light/dark theme. They are only ever used in SVG fill/stroke and
   JS-assembled `linear-gradient()`s — never fed to a WebGL/canvas shader, which
   is the one place a literal hex is still required (see LIME/MINT above). */

/** The canvas. */
export const INK = "var(--color-ink)";
/** First surface off the canvas. */
export const SURFACE = "var(--color-surface)";
/** Default hairline. */
export const LINE = "var(--color-line)";
/** Hairline for grids and rules that must recede. */
export const LINE_SOFT = "var(--color-line-soft)";
/** Muted type — axis labels, secondary glyphs. */
export const MIST_DIM = "var(--color-mist-dim)";
