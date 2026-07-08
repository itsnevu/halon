import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "subtle";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium " +
  "whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "bg-lime text-lime-ink hover:bg-lime-soft glow-lime-sm hover:shadow-[0_0_36px_-6px_rgba(200,230,60,0.9)]",
  ghost: "neu neu-raise border border-line text-white hover:border-lime/40",
  subtle: "text-mist hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 pl-7 pr-2 text-base",
};

const sizesNoArrow: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-8 text-base",
};

/** The circular arrow badge that rides inside a large CTA pill. */
function ArrowBadge({ variant }: { variant: Variant }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-2 grid size-10 place-items-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5",
        variant === "primary" ? "bg-lime-ink text-lime" : "bg-white/10 text-white",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-4">
        <path
          d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children" | "className">;
type AnchorProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "children" | "className"> & { href: string };

export function Button({
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], arrow ? sizes[size] : sizesNoArrow[size], className)}
      {...rest}
    >
      {children}
      {arrow && <ArrowBadge variant={variant} />}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  children,
  ...rest
}: AnchorProps) {
  return (
    <a
      className={cn(base, variants[variant], arrow ? sizes[size] : sizesNoArrow[size], className)}
      {...rest}
    >
      {children}
      {arrow && <ArrowBadge variant={variant} />}
    </a>
  );
}
