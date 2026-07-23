import { cn } from "@/lib/cn";

/** A shimmer placeholder shown while a value is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/[0.06]", className)} />;
}
