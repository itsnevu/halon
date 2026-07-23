import { Fragment } from "react";
import { cn } from "@/lib/cn";

/**
 * A horizontal progress stepper. `current` is the index of the active step —
 * steps before it render as done (✓, filled), the current one is filled with
 * its number, and the rest stay muted. Connectors fill up to the active node.
 * Fixed-width nodes + flexible connectors keep it readable down to ~320px.
 */
export function FlowSteps({
  steps,
  current,
  accent = "#CDFF71",
}: {
  steps: string[];
  current: number;
  accent?: string;
}) {
  return (
    <div className="flex items-start">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const filled = done || active;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <div
                className="mt-3.5 h-0.5 min-w-[12px] flex-1 rounded-full"
                style={{ backgroundColor: i <= current ? accent : "rgba(255,255,255,0.12)" }}
              />
            )}
            <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full border font-mono text-xs transition-colors",
                  filled ? "border-transparent text-black" : "border-line bg-surface text-mist",
                )}
                style={filled ? { backgroundColor: accent } : undefined}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "max-w-[64px] text-center text-[0.625rem] leading-tight",
                  filled ? "text-fg" : "text-mist",
                )}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
