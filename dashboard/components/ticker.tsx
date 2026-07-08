import { Fragment, type ReactNode } from "react";
import { HalonMark } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { SDK_METHODS } from "@/lib/site";

type RailItem = { key: string; node: ReactNode };

/** Marquee copy. Reads as a spec sheet, not a slogan wall. */
const CLAIMS = [
  "Premiums settle in USDC",
  "Quota-share ceded in 4.1s",
  "Payout without a human",
  "Policies are ERC-721",
  "Failure oracle: CAP itself",
  "Reliability index, on-chain derived",
  "Built on CROO Agent Protocol",
  "Two layers deep",
] as const;

const CLAIM_ITEMS: RailItem[] = CLAIMS.map((label) => ({ key: label, node: label }));

const SDK_ITEMS: RailItem[] = SDK_METHODS.map((method) => ({
  key: method,
  node: (
    <>
      {method}
      <span className="text-lime">()</span>
    </>
  ),
}));

const ITEM_BASE =
  "flex shrink-0 items-center gap-6 px-6 font-mono text-xs font-semibold whitespace-nowrap sm:px-8 sm:text-sm";

/**
 * The `marquee` keyframes translate the track by exactly -50%, so the track must
 * hold exactly two identical copies of the item list. The second is aria-hidden.
 */
function Rail({
  items,
  itemClassName,
  bandClassName,
  markClassName,
  reverse = false,
  tilt = false,
  className,
}: {
  items: RailItem[];
  itemClassName?: string;
  bandClassName: string;
  markClassName?: string;
  reverse?: boolean;
  tilt?: boolean;
  className?: string;
}) {
  const copy = (duplicate: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
      {items.map((item) => (
        <Fragment key={item.key}>
          <span className={cn(ITEM_BASE, itemClassName)}>{item.node}</span>
          <HalonMark className={cn("h-3.5 w-auto opacity-70", markClassName)} />
        </Fragment>
      ))}
    </div>
  );

  return (
    // Clip guard: the tilt + scale push the band past the viewport on purpose.
    // `overflow-x-clip` (not hidden) leaves vertical overhang visible so the
    // rotated band can lap over its neighbours without gaining a scroll container.
    <div className={cn("relative z-10 w-full overflow-x-clip", className)}>
      <div
        className={cn(
          "overflow-hidden border-y py-3.5 select-none",
          bandClassName,
          tilt && "my-[-1px] -rotate-[0.6deg] scale-105",
        )}
      >
        <div
          className={cn(
            "flex w-max hover:[animation-play-state:paused] motion-reduce:animate-none",
            reverse ? "animate-marquee-rev" : "animate-marquee",
          )}
        >
          {copy(false)}
          {copy(true)}
        </div>
      </div>
    </div>
  );
}

/** The loud brand-gradient band that sits directly under the hero. */
export function Ticker({ className }: { className?: string }) {
  return (
    <Rail
      items={CLAIM_ITEMS}
      itemClassName="tracking-[0.16em] uppercase"
      bandClassName="border-lime-deep/30 brand-grad-x text-lime-ink"
      // The mark's own gradient would vanish against the band it sits on;
      // `brightness-0` flattens it to the band's ink colour instead.
      markClassName="brightness-0 opacity-45"
      tilt
      className={className}
    />
  );
}

/** Quieter secondary rail: the SDK surface, scrolling the other way. */
export function TickerReverse({ className }: { className?: string }) {
  return (
    <Rail
      items={SDK_ITEMS}
      itemClassName="tracking-[0.08em] normal-case"
      bandClassName="border-line bg-ink text-mist"
      markClassName="opacity-55"
      reverse
      className={className}
    />
  );
}
