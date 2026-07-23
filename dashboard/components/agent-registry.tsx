"use client";

import { riskBand, RISK_BAND_LABEL, type RiskBand } from "@/lib/risk-engine";
import { pct, shortAddr } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, type Tone } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import LottiePlayer from "@/components/ui/lottie-player";
import { Reveal } from "@/components/ui/reveal";
import { LIME, SPRING, MINT } from "@/lib/brand";
import { useAgents, type OnchainAgent } from "@/lib/use-agents";

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

function ReliabilityBar({ reliability, band }: { reliability: number; band: RiskBand }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
      <div
        className={cn("h-full rounded-full", BAND_BAR[band])}
        style={{ width: `${(reliability * 100).toFixed(1)}%` }}
      />
    </div>
  );
}

/* ── rows ───────────────────────────────────────────────────── */

function AgentRow({ a }: { a: OnchainAgent }) {
  const reliability = a.reliabilityBps / 10000;
  const band = riskBand(reliability);
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-3 pr-4">
        <div className="text-fg">{a.name || shortAddr(a.wallet)}</div>
        <div className="font-mono text-xs text-mist-dim">{a.handle || shortAddr(a.wallet)}</div>
      </td>
      <td className="py-3 pr-4">
        <span className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
          {a.category || "—"}
        </span>
      </td>
      <td className="py-3 pr-4">
        {a.firstParty ? (
          <Badge tone="lime">First-party</Badge>
        ) : (
          <span className="text-mist-dim">Third-party</span>
        )}
      </td>
      <td className="min-w-[160px] py-3 pr-4">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="tabular text-fg">{pct(reliability, 1)}</span>
          <Badge tone={BAND_TONE[band]}>{RISK_BAND_LABEL[band]}</Badge>
        </div>
        <ReliabilityBar reliability={reliability} band={band} />
      </td>
      <td className="py-3">
        <span className={cn("text-xs", a.active ? "text-lime" : "text-mist-dim")}>
          {a.active ? "Active" : "Inactive"}
        </span>
      </td>
    </tr>
  );
}

function RegistryTable({ agents }: { agents: OnchainAgent[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
          <th className="py-2 pr-4 font-normal">Agent</th>
          <th className="py-2 pr-4 font-normal">Category</th>
          <th className="py-2 pr-4 font-normal">Party</th>
          <th className="py-2 pr-4 font-normal">Reliability</th>
          <th className="py-2 font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((a) => (
          <AgentRow key={a.wallet} a={a} />
        ))}
      </tbody>
    </table>
  );
}

function RegistryCards({ agents }: { agents: OnchainAgent[] }) {
  return (
    <ul className="space-y-3">
      {agents.map((a) => {
        const reliability = a.reliabilityBps / 10000;
        const band = riskBand(reliability);
        return (
          <li key={a.wallet} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-fg">{a.name || shortAddr(a.wallet)}</div>
                <div className="font-mono text-xs text-mist-dim">{a.handle || shortAddr(a.wallet)}</div>
              </div>
              <Badge tone={BAND_TONE[band]}>{RISK_BAND_LABEL[band]}</Badge>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-mono text-mist-dim uppercase">{a.category || "—"}</span>
              <span className="tabular text-fg">{pct(reliability, 1)}</span>
            </div>
            <div className="mt-2">
              <ReliabilityBar reliability={reliability} band={band} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── section ────────────────────────────────────────────────── */

export function AgentRegistry() {
  const { agents, live } = useAgents();

  return (
    <Section
      id="agents"
      wide
      actions={
        <div className="relative hidden aspect-[4/3] w-[440px] max-w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-black neu neu-raise md:block">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              aria-hidden="true"
              style={{
                filter:
                  "sepia(1) saturate(6) hue-rotate(30deg) brightness(1.15) drop-shadow(0 0 26px rgba(200,230,60,0.35))",
              }}
            >
              <LottiePlayer animationPath="/lottie/stack.json" className="h-[560px] w-[560px]" />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-color opacity-70"
            style={{ background: `linear-gradient(155deg, ${LIME} 0%, ${SPRING} 45%, ${MINT} 100%)` }}
          />
        </div>
      }
      eyebrow="Reliability index"
      index="04"
      title="Every agent, on-chain."
      lead="Identity and reliability come straight from the AgentRegistry contract — nothing is stored in the app. Anyone can read the same registry."
    >
      <div className="mt-8">
        {agents.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-mist">
            {live
              ? "No agents registered yet. The operator registers agents on-chain via AgentRegistry.registerAgent()."
              : "Connect a deployed AgentRegistry (NEXT_PUBLIC_AGENT_REGISTRY) to read the live registry."}
          </div>
        ) : (
          <Reveal>
            <div className="hidden md:block">
              <RegistryTable agents={agents} />
            </div>
            <div className="md:hidden">
              <RegistryCards agents={agents} />
            </div>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
