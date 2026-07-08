import type { ReactNode } from "react";
import { POLICIES, agentById } from "@/lib/data";
import { agoLabel, basescanTx, durationLabel, pct, shortHash, usd, usd0 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Policy, PolicyStatus } from "@/lib/types";
import { Badge, Meta, type Tone } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import iconLayers from "@/public/icon-layers.png";
import artPolicyStack from "@/public/art-policy-stack.png";
import { Reveal } from "@/components/ui/reveal";

/* ── status → badge ─────────────────────────────────────────────
   Red is reserved for discharge. A settled or expired policy is not a
   failure — it simply ran its course, so it goes grayscale. */

const STATUS: Record<PolicyStatus, { tone: Tone; label: string; dot: boolean }> = {
  active: { tone: "lime", label: "In force", dot: true },
  discharged: { tone: "danger", label: "Discharged", dot: true },
  settled: { tone: "neutral", label: "Settled", dot: false },
  expired: { tone: "neutral", label: "Expired", dot: false },
};

/* ── rollup, computed once at module scope — all pure, safe during SSR ── */

const IN_FORCE = POLICIES.filter((p) => p.status === "active").length;
const DISCHARGED = POLICIES.filter((p) => p.status === "discharged").length;
const PREMIUM_TOTAL = POLICIES.reduce((sum, p) => sum + p.premiumUsd, 0);
const COVER_TOTAL = POLICIES.reduce((sum, p) => sum + p.coverageUsd, 0);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Elapsed share of the tenor. The countdown, with no JS behind it. */
function burndown(p: Policy): number {
  const total = p.tenorHours * 3600;
  if (total <= 0) return 1;
  return clamp01(p.boundAgoSeconds / total);
}

/* ── icons ──────────────────────────────────────────────────── */

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-2.5 shrink-0"
    >
      <path d="M3.6 1.4h5v5" />
      <path d="M8.6 1.4 4 6" />
      <path d="M7.2 6.6v1.8a.6.6 0 0 1-.6.6H1.8a.6.6 0 0 1-.6-.6V3.6a.6.6 0 0 1 .6-.6h1.8" />
    </svg>
  );
}

/* ── the cede bar ───────────────────────────────────────────────
   Quota share, drawn to scale. Left is what Sentinel keeps on its own
   balance sheet; right is what Bastion Re assumes the instant the policy
   binds. Nobody waits for a treaty renewal. */

function CedeBar({ coverageUsd, cededShare }: { coverageUsd: number; cededShare: number }) {
  const ceded = clamp01(cededShare);
  const retainedUsd = coverageUsd * (1 - ceded);
  const cededUsd = coverageUsd * ceded;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 font-mono text-[0.625rem] tracking-wide uppercase">
        <span className="text-mist-dim">Sentinel retains</span>
        <span className="text-mist-dim">Bastion Re assumes</span>
      </div>

      <div
        className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-line"
        aria-hidden="true"
      >
        <div className="h-full bg-lime" style={{ width: `${(1 - ceded) * 100}%` }} />
        <div className="h-full bg-info/50" style={{ width: `${ceded * 100}%` }} />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 font-mono text-[0.625rem] text-mist-dim">
        <span className="tabular">{usd0(retainedUsd)}</span>
        <span className="tabular">{usd0(cededUsd)}</span>
      </div>
    </div>
  );
}

/* ── one token ──────────────────────────────────────────────── */

function PolicyCard({ policy }: { policy: Policy }) {
  const status = STATUS[policy.status];
  const insured = agentById(policy.insuredAgentId);
  const isActive = policy.status === "active";
  const isDischarged = policy.status === "discharged";
  const elapsed = burndown(policy);

  return (
    <article
      className={cn(
        "panel group relative flex h-full flex-col overflow-hidden p-0",
        "transition-colors duration-200 hover:border-lime/30",
      )}
    >
      {isDischarged && (
        <div
          aria-hidden="true"
          className="stripe-danger pointer-events-none absolute inset-0 opacity-[0.35]"
        />
      )}

      {/* top strip — the token id is the identity, so it leads */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 className="font-mono text-lg text-white">
          <span className="text-mist-dim">#</span>
          <span className="tabular">{policy.tokenId}</span>
        </h3>
        <Badge tone={status.tone} dot={status.dot}>
          {status.label}
        </Badge>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* who is being insured */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              Insures
            </p>
            <p className="mt-1.5 truncate text-white">{insured?.name ?? policy.insuredAgentName}</p>
            {insured && (
              <p className="font-mono text-xs text-mist-dim">{insured.handle}</p>
            )}
          </div>
          {policy.reinsurancePolicyId !== undefined && (
            <span className="mt-1 shrink-0 rounded border border-info/25 bg-info/10 px-2 py-0.5 font-mono text-[0.625rem] text-info">
              RE #{policy.reinsurancePolicyId}
            </span>
          )}
        </div>

        {/* the two numbers that matter */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              Coverage
            </p>
            <p className="tabular mt-1.5 font-display text-2xl text-white">
              {usd0(policy.coverageUsd)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              Premium
            </p>
            <p className="tabular mt-1.5 font-display text-2xl text-lime">
              {usd(policy.premiumUsd)}
            </p>
          </div>
        </div>

        <CedeBar coverageUsd={policy.coverageUsd} cededShare={policy.cededShare} />

        <div className="space-y-2.5">
          <Meta label="Reliability at bind">{pct(policy.reliabilityAtBind, 1)}</Meta>
          <Meta label="Tenor">{durationLabel(policy.tenorHours * 3600)}</Meta>
          <Meta label="Remaining">
            {isActive ? durationLabel(policy.remainingSeconds) : "n/a"}
          </Meta>
          <Meta label="Bound">{agoLabel(policy.boundAgoSeconds)}</Meta>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 font-mono text-[0.625rem]">
        <span className="truncate text-mist-dim">{policy.capOrderId}</span>
        <a
          href={basescanTx(policy.txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-mist-dim hover:text-lime"
        >
          {shortHash(policy.txHash)}
          <ExternalLinkIcon />
        </a>
      </div>

      {/* the countdown, rendered as geometry rather than a timer */}
      {isActive && (
        <div className="h-0.5 w-full bg-line" aria-hidden="true">
          <div className="h-full bg-lime" style={{ width: `${elapsed * 100}%` }} />
        </div>
      )}
    </article>
  );
}

/* ── section ────────────────────────────────────────────────── */

function RailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span>{label}</span>
      <span className="tabular text-white">{children}</span>
    </div>
  );
}

export function PolicyBook() {
  return (
    <Section
      id="policies"
      icon={iconLayers}
      art={
        <SectionArt
          src={artPolicyStack}
          contain
          className="-right-32 bottom-0 hidden size-[640px] opacity-[0.15] lg:block"
        />
      }
      eyebrow="Policy book"
      index="05"
      title="Every policy is an ERC-721."
      lead="Transferable, inspectable, and each one back-to-back reinsured the moment it was bound. The token is the claim."
    >
      <Reveal>
        <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase">
          <RailItem label="Policies written">{POLICIES.length}</RailItem>
          <RailItem label="In force">{IN_FORCE}</RailItem>
          <div className="flex items-baseline gap-2.5">
            <span>Discharged</span>
            <span className="tabular text-danger">{DISCHARGED}</span>
          </div>
          <RailItem label="Premium collected">{usd0(PREMIUM_TOTAL)}</RailItem>
          <RailItem label="Cover written">{usd0(COVER_TOTAL)}</RailItem>
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {POLICIES.map((policy, i) => (
          <Reveal key={policy.tokenId} delay={i * 60}>
            <PolicyCard policy={policy} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
