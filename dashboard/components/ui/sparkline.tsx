import { cn } from "@/lib/cn";

/**
 * Pure-SVG sparkline. No chart library — the whole app ships zero runtime deps
 * beyond React, which keeps the bundle honest.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeWidth = 1.5,
  className,
  stroke = "currentColor",
  fill = false,
  /** Draw a dot on the last point. */
  marker = true,
  id,
}: {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  stroke?: string;
  fill?: boolean;
  marker?: boolean;
  /** Required when `fill` is set — gradients need a unique id. */
  id?: string;
}) {
  if (data.length < 2) return null;

  const pad = strokeWidth + 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const x = (i: number) => (i / (data.length - 1)) * (width - pad * 2) + pad;
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(2)},${height} L${x(0).toFixed(2)},${height} Z`;
  const gradId = `spark-${id ?? "x"}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
        </>
      )}
      <path
        d={line}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {marker && (
        <circle
          cx={x(data.length - 1)}
          cy={y(data[data.length - 1])}
          r={strokeWidth + 0.6}
          fill={stroke}
        />
      )}
    </svg>
  );
}
