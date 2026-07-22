import { AGENTS, UTIL_A } from "@/lib/data";
import {
  quote,
  riskBand,
  RISK_BAND_LABEL,
  RELIABILITY_FLOOR,
  type RiskBand,
} from "@/lib/risk-engine";
import { pct, usd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Agent, AgentRole } from "@/lib/types";
import { Badge, StatusDot, type Tone } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import LottiePlayer from "@/components/ui/lottie-player";
import artMeshRibbon from "@/public/art-mesh-ribbon.png";
import { Reveal } from "@/components/ui/reveal";
import { Sparkline } from "@/components/ui/sparkline";
import { DANGER, LIME, SPRING, MINT } from "@/lib/brand";

const ROLE_TONE: Record<AgentRole, Tone> = {
  client: "neutral",
  worker: "neutral",
  underwriter: "lime",
  reinsurer: "info",
};

const BAND_TONE: Record<RiskBand, Tone> = {
  prime: "lime",
  standard: "lime",
  watch: "warn",
  declined: "danger",
};

const BAND_BAR: Record<RiskBand, string> = {
  prime: "bg-lime",
  standard: "bg-lime",
  watch: "bg-warn",
  declined: "bg-danger",
};

/** Everything a row needs, computed once. All pure — safe during SSR. */
function derive(a: Agent) {
  const band = riskBand(a.reliability);
  const isWorker = a.role === "worker";
  return {
    agent: a,
    band,
    isWorker,
    /** Only workers are insurable subjects; the rest are counterparties. */
    quote: isWorker
      ? quote({
          reliability: a.reliability,
          coverageUsd: 100,
          tenorHours: 24,
          utilization: UTIL_A,
        })
      : null,
    rising: a.history[a.history.length - 1] >= a.history[0],
  };
}

const ROWS = AGENTS.map(derive);

/* ── cells ──────────────────────────────────────────────────── */

function ReliabilityBar({
  reliability,
  band,
  className,
}: {
  reliability: number;
  band: RiskBand;
  className?: string;
}) {
  return (
    <div
      className={cn("h-1 overflow-hidden rounded-full bg-surface-3", className)}
      aria-hidden="true"
    >
      <div
        className={cn("h-full rounded-full", BAND_BAR[band])}
        style={{ width: `${(reliability * 100).toFixed(1)}%` }}
      />
    </div>
  );
}

/** `48 / 10 / 2` — red only when there is an actual failure to report. */
function OrderCounts({ agent }: { agent: Agent }) {
  const slash = <span className="px-1 text-mist-dim">/</span>;
  return (
    <span className="tabular text-sm whitespace-nowrap">
      <span className="text-white">{agent.completed}</span>
      {slash}
      <span className={agent.rejected > 0 ? "text-danger" : "text-mist-dim"}>
        {agent.rejected}
      </span>
      {slash}
      <span className={agent.expired > 0 ? "text-warn" : "text-mist-dim"}>
        {agent.expired}
      </span>
    </span>
  );
}

function Premium({ row }: { row: (typeof ROWS)[number] }) {
  if (!row.quote) {
    return <span className="font-mono text-xs text-mist-dim">n/a</span>;
  }
  if (!row.quote.insurable) {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span className="tabular text-sm text-mist-dim" aria-hidden="true">
          n/a
        </span>
        <span className="font-mono text-[0.625rem] tracking-wide text-danger uppercase">
          declined
        </span>
      </span>
    );
  }
  return <span className="tabular text-sm text-white">{usd(row.quote.premiumUsd)}</span>;
}

function AgentIdentity({ agent }: { agent: Agent }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {agent.online && <StatusDot tone="lime" />}
        <span className="truncate text-sm text-white">{agent.name}</span>
        {agent.firstParty && <Badge tone="neutral">Ours</Badge>}
      </div>
      <span className="mt-0.5 block font-mono text-xs text-mist-dim">{agent.handle}</span>
    </div>
  );
}

/* ── derivation callout ─────────────────────────────────────── */

function Derivation() {
  const kw = "text-mist-dim";
  return (
    <div className="neu-inset rounded-2xl p-4 font-mono text-[0.625rem] text-mist sm:text-xs">
      <pre className="no-scrollbar overflow-x-auto whitespace-pre-wrap break-words sm:whitespace-pre sm:break-normal">
        <code>
          <span className={kw}>{"// there is no getMeritScore()\n"}</span>
          <span className={kw}>{"const"}</span>
          {" done   = "}
          <span className={kw}>{"await"}</span>
          {" client.listOrders({ agentId, status: "}
          <span className="text-lime">{"'completed'"}</span>
          {" })\n"}
          <span className={kw}>{"const"}</span>
          {" failed = "}
          <span className={kw}>{"await"}</span>
          {" client.listOrders({ agentId, status: "}
          <span className="text-lime">{"'rejected'"}</span>
          {"  })\n"}
          {"reliability  = done.length / (done.length + failed.length + expired.length)"}
        </code>
      </pre>
    </div>
  );
}

/* ── legend ─────────────────────────────────────────────────── */

const LEGEND: { dot: string; label: string }[] = [
  { dot: "bg-lime", label: "Prime ≥95%" },
  { dot: "bg-lime", label: "Standard ≥80%" },
  { dot: "bg-warn", label: `Watchlist ≥${(RELIABILITY_FLOOR * 100).toFixed(0)}%` },
  { dot: "bg-danger", label: `Declined <${(RELIABILITY_FLOOR * 100).toFixed(0)}%` },
];

function Legend() {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-4 font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", l.dot)} aria-hidden="true" />
            {l.label}
          </span>
        ))}
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-mist-dim text-pretty">
        Below the {(RELIABILITY_FLOOR * 100).toFixed(0)}% floor the pool declines to quote at
        any price. No premium prices a coin flip you can&rsquo;t hedge.
      </p>
    </div>
  );
}

/* ── table ──────────────────────────────────────────────────── */

const TH =
  "border-b border-line px-3 py-3 font-mono text-[0.625rem] font-normal uppercase tracking-[0.16em] text-mist-dim whitespace-nowrap";
const TD = "border-b border-line-soft px-3 py-4 align-middle";

function RegistryTable() {
  return (
    <div className="no-scrollbar overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          HALON Reliability Index for every agent on the registry, with the live premium for
          $100 of cover over 24 hours.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cn(TH, "pl-1 text-left")}>
              Agent
            </th>
            <th scope="col" className={cn(TH, "text-left")}>
              Role
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Reliability
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Trend
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Done / Rej / Exp
            </th>
            <th scope="col" className={cn(TH, "text-left")}>
              Band
            </th>
            <th scope="col" className={cn(TH, "pr-1 text-right")}>
              Premium $100 / 24h
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const a = row.agent;
            const declined = row.band === "declined";
            return (
              <Reveal
                as="tr"
                key={a.id}
                delay={i * 60}
                className={cn(
                  "transition-colors duration-200 hover:bg-white/[0.02]",
                  declined && "bg-danger/[0.03]",
                )}
              >
                <td className={cn(TD, "pl-1")}>
                  <AgentIdentity agent={a} />
                </td>

                <td className={TD}>
                  <Badge tone={ROLE_TONE[a.role]}>{a.role}</Badge>
                </td>

                <td className={cn(TD, "text-right")}>
                  <span className="tabular text-sm text-white">{pct(a.reliability, 1)}</span>
                  <ReliabilityBar
                    reliability={a.reliability}
                    band={row.band}
                    className="mt-1.5 ml-auto w-16"
                  />
                </td>

                <td className={cn(TD, "text-right")}>
                  <span className="inline-flex justify-end">
                    <Sparkline
                      data={a.history}
                      width={90}
                      height={26}
                      id={a.id}
                      stroke={row.rising ? LIME : DANGER}
                    />
                  </span>
                </td>

                <td className={cn(TD, "text-right")}>
                  <OrderCounts agent={a} />
                </td>

                <td className={TD}>
                  <Badge tone={BAND_TONE[row.band]}>{RISK_BAND_LABEL[row.band]}</Badge>
                </td>

                <td className={cn(TD, "pr-1 text-right")}>
                  <span className="flex justify-end">
                    <Premium row={row} />
                  </span>
                </td>
              </Reveal>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── mobile ─────────────────────────────────────────────────── */

function RegistryCards() {
  return (
    <ul className="space-y-3">
      {ROWS.map((row, i) => {
        const a = row.agent;
        const declined = row.band === "declined";
        return (
          <Reveal as="li" key={a.id} delay={i * 60}>
            <div className={cn("panel-flat p-4", declined && "bg-danger/[0.03]")}>
              <div className="flex items-start justify-between gap-3">
                <AgentIdentity agent={a} />
                <Sparkline
                  data={a.history}
                  width={90}
                  height={26}
                  id={`m-${a.id}`}
                  stroke={row.rising ? LIME : DANGER}
                  className="mt-1 shrink-0"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={ROLE_TONE[a.role]}>{a.role}</Badge>
                <Badge tone={BAND_TONE[row.band]}>{RISK_BAND_LABEL[row.band]}</Badge>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
                    Reliability
                  </span>
                  <span className="tabular text-sm text-white">{pct(a.reliability, 1)}</span>
                </div>
                <ReliabilityBar
                  reliability={a.reliability}
                  band={row.band}
                  className="mt-2 w-full"
                />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
                    Done / Rej / Exp
                  </dt>
                  <dd className="mt-1">
                    <OrderCounts agent={a} />
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
                    $100 / 24h
                  </dt>
                  <dd className="mt-1 flex justify-end">
                    <Premium row={row} />
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}

/* ── section ────────────────────────────────────────────────── */

export function AgentRegistry() {
  return (
    <Section
      id="agents"
      wide
      art={
        <div className="absolute inset-x-0 -top-48 -z-10 h-[760px] flex justify-center opacity-40 mix-blend-screen pointer-events-none">
          <LottiePlayer animationPath="/lottie/opportunities.json" className="w-[1000px] h-[1000px]" />
        </div>
      }
      actions={
        <div className="relative hidden aspect-[4/3] w-[320px] shrink-0 overflow-hidden rounded-2xl border border-line bg-black neu neu-raise lg:block">
          <video
            className="size-full object-cover"
            src="/video/eth-forge.webm"
            poster="/video/eth-forge-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            style={{ filter: "hue-rotate(-115deg) saturate(1.15)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-color opacity-70"
            style={{ background: `linear-gradient(155deg, ${LIME} 0%, ${SPRING} 45%, ${MINT} 100%)` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{ background: `radial-gradient(120% 80% at 50% 108%, ${LIME}66 0%, ${MINT}22 40%, transparent 68%)` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 55%)" }}
          />
        </div>
      }
      eyebrow="Reliability index"
      index="04"
      title="CAP has no reputation getter. So we built one."
      lead="Every score below is derived from on-chain order history: completed against rejected and expired. It is the only input the pricing model needs, and anyone can recompute it."
    >
      <Reveal>
        <Derivation />
      </Reveal>

      <div className="mt-8">
        <div className="hidden md:block">
          <RegistryTable />
        </div>
        <div className="md:hidden">
          <RegistryCards />
        </div>
      </div>

      <Reveal>
        <Legend />
      </Reveal>
    </Section>
  );
}
