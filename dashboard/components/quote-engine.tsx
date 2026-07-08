"use client";

/**
 * QuoteEngine — the premium calculator, wired to the real pricing model.
 *
 * Nothing on this screen is a hardcoded number. `quote()` and `premiumCurve()`
 * are the same pure functions `RiskEngine.sol` implements on-chain; every
 * figure below — the premium, the decomposition, the curve, the reinsurance
 * split — falls out of them. Move the slider and the whole card moves with it.
 */

import { useId, useMemo, useState, type ChangeEvent } from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import iconReticle from "@/public/icon-reticle.png";
import { cn } from "@/lib/cn";
import {
  DANGER,
  INK,
  LIME,
  LINE,
  LINE_SOFT as GRID,
  MIST_DIM as AXIS_TEXT,
  limeAlpha,
} from "@/lib/brand";
import { POOL_A, UTIL_A, WORKERS } from "@/lib/data";
import { bps, multiple, pct, usd, usd0, usdCompact } from "@/lib/format";
import {
  premiumCurve,
  quote,
  RELIABILITY_FLOOR,
  RISK_BAND_LABEL,
  riskBand,
  type CurvePoint,
  type RiskBand,
} from "@/lib/risk-engine";

/* ── constants ──────────────────────────────────────────────── */

const COVERAGE_MIN = 10;
const COVERAGE_MAX = 50_000;
const COVERAGE_PRESETS = [100, 250, 500, 1_000, 2_000];

const TENORS: { hours: number; label: string }[] = [
  { hours: 6, label: "6h" },
  { hours: 12, label: "12h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "72h" },
  { hours: 168, label: "7d" },
];

const SLIDER_MIN = 30;
const SLIDER_MAX = 100;

const BAND_TONE: Record<RiskBand, Tone> = {
  prime: "lime",
  standard: "lime",
  watch: "warn",
  declined: "danger",
};

/** Default selection: Aurora Analytics sits at exactly 0.80. */
const DEFAULT_AGENT_ID = "cap:agent:aurora";
const DEFAULT_RELIABILITY = 0.8;

/* ── chart geometry ─────────────────────────────────────────── */

const CW = 640;
const CH = 260;
const PAD = { top: 22, right: 18, bottom: 34, left: 56 };
const PW = CW - PAD.left - PAD.right;
const PH = CH - PAD.top - PAD.bottom;
const X_FROM = 0.3;
const X_TO = 1;
const X_TICKS = [0.3, 0.5, 0.7, 0.85, 1];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Round up to a friendly axis maximum so the y-ticks divide evenly. */
function niceCeil(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / base;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return m * base;
}

const f2 = (n: number) => n.toFixed(2);

/* ── small presentational helpers ───────────────────────────── */

function LeaderRow({
  label,
  value,
  labelClass,
  valueClass,
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("shrink-0 text-mist-dim", labelClass)}>{label}</span>
      <span aria-hidden="true" className="mb-1 flex-1 self-end border-b border-dashed border-line" />
      <span className={cn("tabular shrink-0 text-mist", valueClass)}>{value}</span>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase">{label}</p>
      <p className="tabular mt-1.5 font-display text-xl leading-none text-white">{value}</p>
      {note && <p className="mt-1.5 text-xs text-mist-dim">{note}</p>}
    </div>
  );
}

/* ── component ──────────────────────────────────────────────── */

export function QuoteEngine() {
  const uid = useId();
  const sliderId = `${uid}-reliability`;
  const coverageId = `${uid}-coverage`;
  const agentLabelId = `${uid}-agent`;
  const tenorLabelId = `${uid}-tenor`;

  const [reliability, setReliability] = useState(DEFAULT_RELIABILITY);
  const [coverageUsd, setCoverageUsd] = useState(100);
  const [coverageText, setCoverageText] = useState("100");
  const [tenorHours, setTenorHours] = useState(24);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(DEFAULT_AGENT_ID);

  const q = useMemo(
    () => quote({ reliability, coverageUsd, tenorHours, utilization: UTIL_A }),
    [reliability, coverageUsd, tenorHours],
  );

  const curve = useMemo(
    () =>
      premiumCurve(
        { coverageUsd, tenorHours, utilization: UTIL_A },
        { from: 0.3, to: 1, points: 80 },
      ),
    [coverageUsd, tenorHours],
  );

  const band = riskBand(reliability);
  const belowFloor = reliability < RELIABILITY_FLOOR;

  /* ── handlers ── */

  function onSlider(e: ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    setReliability(clamp(v, SLIDER_MIN, SLIDER_MAX) / 100);
    setSelectedAgentId(null);
  }

  function pickAgent(id: string, r: number) {
    setSelectedAgentId(id);
    setReliability(r);
  }

  function onCoverageChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setCoverageText(raw);
    const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) setCoverageUsd(clamp(parsed, COVERAGE_MIN, COVERAGE_MAX));
  }

  function onCoverageBlur() {
    setCoverageText(String(coverageUsd));
  }

  function pickCoverage(v: number) {
    setCoverageUsd(v);
    setCoverageText(String(v));
  }

  /* ── slider paint ── */

  const sliderPct = ((reliability * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const floorPct = ((RELIABILITY_FLOOR * 100 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const sliderBg = `linear-gradient(to right, ${LIME} 0%, ${LIME} ${sliderPct}%, ${LINE} ${sliderPct}%, ${LINE} 100%)`;

  /* ── chart ── */

  const chart = useMemo(() => buildChart(curve, reliability, q.premiumUsd), [curve, reliability, q.premiumUsd]);

  const capacityUsd = POOL_A.totalCapitalUsd - POOL_A.lockedUsd;
  const chipLabel = usd(q.premiumUsd);
  const chipW = chipLabel.length * 5.6 + 14;
  let chipX = chart.cx + 10;
  if (chipX + chipW > PAD.left + PW) chipX = chart.cx - 10 - chipW;
  const chipY = clamp(chart.cy - 26, PAD.top, PAD.top + PH - 18);

  const pointColor = q.insurable ? LIME : DANGER;
  const marginTone = (n: number) => (n >= 0 ? "text-lime" : "text-danger");

  return (
    <Section
      id="quote"
      icon={iconReticle}
      art={
        <>
          <div
            aria-hidden="true"
            className="grid-bg-sm mask-fade-b pointer-events-none absolute inset-0 opacity-60"
          />
          <div
            aria-hidden="true"
            className="brand-grad pointer-events-none absolute -top-32 left-1/2 h-[460px] w-[900px] -translate-x-1/2 rounded-[50%] opacity-[0.06] blur-[130px]"
          />
        </>
      }
      eyebrow="Quote engine"
      index="02"
      title="Pricing you can audit, not just trust."
      lead="Every premium on this page comes out of the same pure function RiskEngine.sol runs on-chain. Move the slider and watch the loading decompose."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[420px_1fr]">
        {/* ── LEFT: controls ─────────────────────────────────── */}
        <Reveal>
          <div className="panel space-y-8 p-6">
            {/* 1 — insured agent */}
            <div>
              <p
                id={agentLabelId}
                className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase"
              >
                Insured agent
              </p>
              <div role="group" aria-labelledby={agentLabelId} className="mt-3 flex flex-wrap gap-2">
                {WORKERS.map((a) => {
                  const selected = selectedAgentId === a.id;
                  const uninsurable = a.reliability < RELIABILITY_FLOOR;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => pickAgent(a.id, a.reliability)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors duration-150",
                        selected
                          ? uninsurable
                            ? "border-danger/30 bg-danger/10 text-danger"
                            : "border-lime/40 bg-lime/10 text-lime"
                          : "border-line text-mist hover:text-white",
                      )}
                    >
                      {a.name}
                      <span
                        className={cn(
                          "tabular ml-1.5 font-mono text-[0.625rem]",
                          selected ? "opacity-60" : "text-mist-dim",
                        )}
                      >
                        {pct(a.reliability, 0)}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={selectedAgentId === null}
                  onClick={() => setSelectedAgentId(null)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors duration-150",
                    selectedAgentId === null
                      ? "border-lime/40 bg-lime/10 text-lime"
                      : "border-line text-mist hover:text-white",
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* 2 — reliability index */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <label
                  htmlFor={sliderId}
                  className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase"
                >
                  Reliability index
                </label>
                <span
                  className={cn(
                    "tabular font-display text-2xl leading-none",
                    belowFloor ? "text-danger" : "text-lime",
                  )}
                >
                  {pct(reliability, 1)}
                </span>
              </div>

              <div className="relative mt-4">
                <input
                  id={sliderId}
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={0.5}
                  value={reliability * 100}
                  onChange={onSlider}
                  aria-valuetext={pct(reliability, 1)}
                  style={{ background: sliderBg }}
                  className={cn(
                    "h-1.5 w-full cursor-pointer appearance-none rounded-full",
                    "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink",
                    "[&::-webkit-slider-thumb]:bg-lime",
                    "[&::-webkit-slider-thumb]:shadow-[0_0_14px_-2px_rgba(200,230,60,0.9)]",
                    "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer",
                    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
                    "[&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-lime",
                    "[&::-moz-range-thumb]:shadow-[0_0_14px_-2px_rgba(200,230,60,0.9)]",
                    "[&::-moz-range-track]:bg-transparent",
                  )}
                />
                {/* underwriting floor marker */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 h-4 w-px -translate-y-1/2 bg-danger/70"
                  style={{ left: `${floorPct}%` }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[calc(50%+12px)] -translate-x-1/2 font-mono text-[0.5625rem] tracking-wide whitespace-nowrap text-danger"
                  style={{ left: `${floorPct}%` }}
                >
                  FLOOR {(RELIABILITY_FLOOR * 100).toFixed(0)}%
                </div>
              </div>
              <div className="h-4" />
            </div>

            {/* 3 — coverage */}
            <div>
              <label
                htmlFor={coverageId}
                className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase"
              >
                Coverage
              </label>
              <div className="mt-3 flex items-baseline gap-1.5 border-b border-line focus-within:border-lime">
                <span aria-hidden="true" className="font-display text-xl text-mist-dim">
                  $
                </span>
                <input
                  id={coverageId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={coverageText}
                  onChange={onCoverageChange}
                  onBlur={onCoverageBlur}
                  aria-describedby={`${coverageId}-hint`}
                  className="tabular w-full min-w-0 bg-transparent pb-1.5 font-display text-xl text-white outline-none placeholder:text-mist-dim"
                />
              </div>
              <p id={`${coverageId}-hint`} className="sr-only">
                Between {usd0(COVERAGE_MIN)} and {usd0(COVERAGE_MAX)}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COVERAGE_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={coverageUsd === v}
                    onClick={() => pickCoverage(v)}
                    className={cn(
                      "tabular rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors duration-150",
                      coverageUsd === v
                        ? "border-lime/40 bg-lime/10 text-lime"
                        : "border-line text-mist-dim hover:text-white",
                    )}
                  >
                    {v.toLocaleString("en-US")}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 — tenor */}
            <div>
              <p
                id={tenorLabelId}
                className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase"
              >
                Tenor
              </p>
              <div
                role="group"
                aria-labelledby={tenorLabelId}
                className="mt-3 flex rounded-lg bg-surface-2 p-1"
              >
                {TENORS.map((t) => (
                  <button
                    key={t.hours}
                    type="button"
                    aria-pressed={tenorHours === t.hours}
                    onClick={() => setTenorHours(t.hours)}
                    className={cn(
                      "tabular flex-1 rounded-md px-2 py-1.5 font-mono text-xs transition-colors duration-150",
                      tenorHours === t.hours
                        ? "bg-surface-3 text-white"
                        : "text-mist-dim hover:text-mist",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 — footer */}
            <p className="font-mono text-[0.625rem] leading-relaxed text-mist-dim">
              Quoted against {POOL_A.name} · utilization {pct(UTIL_A, 1)} · capacity{" "}
              {usd0(capacityUsd)}
            </p>
          </div>
        </Reveal>

        {/* ── RIGHT: results ─────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* A — premium */}
          <Reveal delay={60}>
            <div className="panel relative overflow-hidden p-6">
              {!q.insurable && (
                <div
                  aria-hidden="true"
                  className="stripe-danger mask-fade-b pointer-events-none absolute inset-0 opacity-50"
                />
              )}

              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  {q.insurable ? (
                    <>
                      <Badge tone={BAND_TONE[band]} dot>
                        {RISK_BAND_LABEL[band]}
                      </Badge>
                      <Badge tone="neutral">{bps(q.rateBps)}</Badge>
                    </>
                  ) : (
                    <Badge tone="danger" dot>
                      Declined
                    </Badge>
                  )}
                </div>

                <p
                  className={cn(
                    "tabular mt-6 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none",
                    q.insurable ? "text-glow text-white" : "text-mist-dim",
                  )}
                >
                  {q.insurable ? usd(q.premiumUsd) : "n/a"}
                </p>

                {q.insurable ? (
                  <p className="mt-3 text-sm text-mist-dim">
                    premium · {pct(q.premiumUsd / coverageUsd, 2)} of {usd0(coverageUsd)} cover
                  </p>
                ) : (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-danger">{q.declineReason}</p>
                    <p className="text-sm text-mist-dim">
                      The pool will not write this risk at any price.
                    </p>
                  </div>
                )}

                {/* decomposition */}
                <div
                  aria-hidden={!q.insurable}
                  className={cn(
                    "mt-8 space-y-2.5 font-mono text-xs",
                    !q.insurable && "pointer-events-none opacity-40 select-none",
                  )}
                >
                  {/* Rejection and expiry are two different hazards. Tenor scales the
                      hazard; risk load and utilization only ever scale the loading. */}
                  <LeaderRow label="Expected loss · rejection" value={usd(q.baseLossUsd)} />
                  <LeaderRow label="× Expiry exposure" value={`×${q.tenorFactor.toFixed(3)}`} />
                  <LeaderRow label="× Risk load" value={`×${(1 + q.riskLoad).toFixed(3)}`} />
                  <LeaderRow label="× Utilization" value={`×${q.utilFactor.toFixed(3)}`} />
                  <LeaderRow label="+ Expense fee" value={usd(q.expenseFeeUsd)} />
                  <div aria-hidden="true" className="!my-4 h-px bg-line" />
                  <LeaderRow
                    label="= Premium"
                    value={usd(q.premiumUsd)}
                    labelClass="text-mist"
                    valueClass="font-semibold text-lime"
                  />
                </div>

                {q.insurable && (
                  <div className="mt-6 rounded-lg border border-lime/20 bg-lime/[0.06] p-3">
                    <p className="text-xs leading-relaxed text-mist">
                      Solvency multiple{" "}
                      <span className="tabular text-lime">{multiple(q.solvencyMultiple)}</span>. The
                      pool charges{" "}
                      <span className="tabular text-white">{usd(q.loadingUsd)}</span> above the{" "}
                      <span className="tabular text-white">{usd(q.expectedLossUsd)}</span> it expects
                      to lose.
                    </p>
                    <p className="mt-2 font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
                      Always &gt; 1.00×, by construction
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* B — curve */}
          <Reveal delay={120}>
            <div className="panel p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-white">Premium vs. reliability</h3>
                <p className="text-xs text-mist-dim">everything else held constant</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.625rem] text-mist-dim">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-lime" />
                  premium
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-0 w-4 border-t border-dashed border-mist-dim"
                  />
                  expected loss
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-4 rounded-xs bg-lime/20" />
                  underwriter loading
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[520px]">
                  <svg
                    viewBox={`0 0 ${CW} ${CH}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="block h-auto w-full"
                    role="img"
                    aria-label={`Premium as a function of reliability. At ${pct(
                      reliability,
                      1,
                    )} reliability the premium is ${usd(q.premiumUsd)} on ${usd0(
                      coverageUsd,
                    )} of cover.`}
                  >
                    {/* gridlines + y ticks */}
                    {chart.yTicks.map((t) => (
                      <g key={`y${t.v}`}>
                        <line
                          x1={PAD.left}
                          x2={PAD.left + PW}
                          y1={t.y}
                          y2={t.y}
                          stroke={GRID}
                          strokeWidth={1}
                        />
                        <text
                          x={PAD.left - 8}
                          y={t.y}
                          fill={AXIS_TEXT}
                          fontSize={9}
                          textAnchor="end"
                          dominantBaseline="middle"
                          className="font-mono"
                        >
                          {usdCompact(t.v)}
                        </text>
                      </g>
                    ))}

                    {/* baseline */}
                    <line
                      x1={PAD.left}
                      x2={PAD.left + PW}
                      y1={PAD.top + PH}
                      y2={PAD.top + PH}
                      stroke={GRID}
                      strokeWidth={1}
                    />

                    {/* declined region */}
                    <rect
                      x={PAD.left}
                      y={PAD.top}
                      width={Math.max(0, chart.floorX - PAD.left)}
                      height={PH}
                      fill={DANGER}
                      opacity={0.06}
                    />
                    <line
                      x1={chart.floorX}
                      x2={chart.floorX}
                      y1={PAD.top}
                      y2={PAD.top + PH}
                      stroke={DANGER}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                    <text
                      x={chart.floorX - 7}
                      y={PAD.top + PH / 2}
                      transform={`rotate(-90 ${chart.floorX - 7} ${PAD.top + PH / 2})`}
                      fill={DANGER}
                      fontSize={9}
                      textAnchor="middle"
                      opacity={0.85}
                      className="font-mono"
                    >
                      UNDERWRITING FLOOR
                    </text>

                    {/* the loading — the gap between premium and expected loss */}
                    {chart.areaPath && <path d={chart.areaPath} fill={limeAlpha(0.1)} />}

                    {/* expected loss */}
                    <path
                      d={chart.elPath}
                      fill="none"
                      stroke={AXIS_TEXT}
                      strokeWidth={1.25}
                      strokeDasharray="2 4"
                      strokeLinecap="round"
                    />
                    <text
                      x={chart.elLabel.x}
                      y={chart.elLabel.y}
                      fill={AXIS_TEXT}
                      fontSize={9}
                      textAnchor="middle"
                      className="font-mono"
                    >
                      expected loss
                    </text>

                    {/* premium */}
                    <path
                      d={chart.premiumPath}
                      fill="none"
                      stroke={LIME}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* x ticks */}
                    {X_TICKS.map((t) => (
                      <text
                        key={`x${t}`}
                        x={chart.sx(t)}
                        y={PAD.top + PH + 16}
                        fill={AXIS_TEXT}
                        fontSize={9}
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {pct(t, 0)}
                      </text>
                    ))}

                    {/* crosshair + current point */}
                    <line
                      x1={chart.cx}
                      x2={chart.cx}
                      y1={chart.cy}
                      y2={PAD.top + PH}
                      stroke={pointColor}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      opacity={0.4}
                    />
                    <line
                      x1={PAD.left}
                      x2={chart.cx}
                      y1={chart.cy}
                      y2={chart.cy}
                      stroke={pointColor}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      opacity={0.4}
                    />
                    <circle cx={chart.cx} cy={chart.cy} r={5} fill={pointColor} />
                    <circle cx={chart.cx} cy={chart.cy} r={2} fill="#ffffff" />

                    <g>
                      <rect
                        x={chipX}
                        y={chipY}
                        width={chipW}
                        height={18}
                        rx={4}
                        fill={INK}
                        stroke={pointColor}
                        strokeOpacity={0.45}
                      />
                      <text
                        x={chipX + chipW / 2}
                        y={chipY + 9}
                        fill={pointColor}
                        fontSize={10}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-mono"
                      >
                        {chipLabel}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>

          {/* C — reinsurance */}
          <Reveal delay={180}>
            <div
              className={cn(
                "panel-flat p-6 transition-opacity duration-200",
                !q.insurable && "pointer-events-none opacity-40 select-none",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">
                  What happens to this policy in 4.1 seconds
                </h3>
                <Badge tone="lime">Auto-hedge</Badge>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <Stat label="Ceded share" value={pct(q.cededShare, 0)} />
                <Stat
                  label="Ceded premium"
                  value={usd(q.cededPremiumUsd)}
                  note="to Bastion Re"
                />
                <Stat
                  label="Net retention"
                  value={usd(q.netRetentionUsd)}
                  note="Sentinel's worst case"
                />
              </div>

              <div className="mt-7 space-y-2.5 border-t border-line pt-5 font-mono text-xs">
                <LeaderRow
                  label="Sentinel expected margin"
                  value={usd(q.underwriterMarginUsd)}
                  valueClass={marginTone(q.underwriterMarginUsd)}
                />
                <LeaderRow
                  label="Bastion Re expected margin"
                  value={usd(q.reinsurerMarginUsd)}
                  valueClass={marginTone(q.reinsurerMarginUsd)}
                />
              </div>

              <p className="mt-5 text-xs leading-relaxed text-mist-dim">
                Both layers are margin-positive in expectation. That is the only reason either
                agent shows up.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ── chart builder (pure) ───────────────────────────────────── */

function buildChart(curve: CurvePoint[], reliability: number, premiumUsd: number) {
  const maxSeries = curve.reduce(
    (m, p) => Math.max(m, p.premiumUsd, p.expectedLossUsd),
    0,
  );
  const yMax = niceCeil(Math.max(maxSeries, premiumUsd));

  const sx = (r: number) => PAD.left + ((clamp(r, X_FROM, X_TO) - X_FROM) / (X_TO - X_FROM)) * PW;
  const sy = (v: number) => PAD.top + PH - (clamp(v, 0, yMax) / yMax) * PH;

  const line = (get: (p: CurvePoint) => number) =>
    curve.map((p, i) => `${i ? "L" : "M"}${f2(sx(p.reliability))},${f2(sy(get(p)))}`).join("");

  const premiumPath = line((p) => p.premiumUsd);
  const elPath = line((p) => p.expectedLossUsd);

  // The loading only exists where the premium sits above the fair price.
  const gap = curve.filter((p) => p.premiumUsd >= p.expectedLossUsd);
  const areaPath =
    gap.length > 1
      ? gap.map((p, i) => `${i ? "L" : "M"}${f2(sx(p.reliability))},${f2(sy(p.premiumUsd))}`).join("") +
        gap
          .slice()
          .reverse()
          .map((p) => `L${f2(sx(p.reliability))},${f2(sy(p.expectedLossUsd))}`)
          .join("") +
        "Z"
      : "";

  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => ({ v: yMax * f, y: sy(yMax * f) }));

  const anchor = curve[Math.floor(curve.length * 0.62)] ?? curve[0];

  return {
    sx,
    sy,
    yMax,
    premiumPath,
    elPath,
    areaPath,
    yTicks,
    floorX: sx(RELIABILITY_FLOOR),
    cx: sx(reliability),
    cy: sy(premiumUsd),
    elLabel: {
      x: sx(anchor.reliability),
      y: Math.min(sy(anchor.expectedLossUsd) + 12, PAD.top + PH - 4),
    },
  };
}
