"use client";

import type { ReactNode } from "react";
import { agoLabel, explorerAddr, durationLabel, pct, shortHash, usd, usd0 } from "@/lib/format";
import { shortAddr } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Tone } from "@/components/ui/badge";
import { Badge, Meta } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import iconLayers from "@/public/icon-layers.png";
import artPolicyStack from "@/public/art-policy-stack.png";
import { Reveal } from "@/components/ui/reveal";
import { usePolicies, type OnchainPolicy } from "@/lib/use-policies";

/* ── status → badge ─────────────────────────────────────────────
   Red is reserved for discharge. A settled policy ran its course, so it goes
   grayscale. Statuses come straight from the on-chain Policy.status enum. */

type UiStatus = "active" | "discharged" | "settled" | "none";

const STATUS: Record<UiStatus, { tone: Tone; label: string; dot: boolean }> = {
  active: { tone: "lime", label: "In force", dot: true },
  discharged: { tone: "danger", label: "Discharged", dot: true },
  settled: { tone: "neutral", label: "Settled", dot: false },
  none: { tone: "neutral", label: "—", dot: false },
};

function uiStatus(p: OnchainPolicy): UiStatus {
  if (p.status === "Armed") return "active";
  if (p.status === "Discharged") return "discharged";
  if (p.status === "Settled") return "settled";
  return "none";
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* ── the cede bar ─────────────────────────────────────────────── */

function CedeBar({ coverageUsd, cededShare }: { coverageUsd: number; cededShare: number }) {
  const ceded = clamp01(cededShare);
  const retainedUsd = coverageUsd * (1 - ceded);
  const cededUsd = coverageUsd * ceded;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 font-mono text-[0.625rem] tracking-wide uppercase">
        <span className="text-mist-dim">Pool retains</span>
        <span className="text-mist-dim">Reinsurer assumes</span>
      </div>

      <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
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

/* ── one token ──────────────────────────────────────────────── */

function PolicyCard({ policy, nowSeconds }: { policy: OnchainPolicy; nowSeconds: number }) {
  const st = uiStatus(policy);
  const status = STATUS[st];
  const isActive = st === "active";
  const isDischarged = st === "discharged";

  const tenorSeconds = Math.max(0, policy.expiresAt - policy.boundAt);
  const remaining = Math.max(0, policy.expiresAt - nowSeconds);
  const boundAgo = Math.max(0, nowSeconds - policy.boundAt);
  const elapsed = tenorSeconds > 0 ? clamp01(boundAgo / tenorSeconds) : 1;
  const cededShare = policy.coverageUsd > 0 ? policy.cededCoverageUsd / policy.coverageUsd : 0;
  const reinsured = policy.reinsurer && policy.reinsurer !== "0x0000000000000000000000000000000000000000";

  return (
    <article
      className={cn(
        "panel group relative flex h-full flex-col overflow-hidden p-0",
        "transition-colors duration-200 hover:border-lime/30",
      )}
    >
      {isDischarged && (
        <div aria-hidden="true" className="stripe-danger pointer-events-none absolute inset-0 opacity-[0.35]" />
      )}

      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 className="font-mono text-lg text-fg">
          <span className="text-mist-dim">#</span>
          <span className="tabular">{policy.id}</span>
        </h3>
        <Badge tone={status.tone} dot={status.dot}>
          {status.label}
        </Badge>
      </div>

      <div className="flex-1 space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              {policy.kind === "Treaty" ? "Reinsures pool" : "Beneficiary"}
            </p>
            <p className="mt-1.5 truncate font-mono text-fg">{shortAddr(policy.beneficiary)}</p>
          </div>
          {reinsured && (
            <span className="mt-1 shrink-0 rounded border border-info/25 bg-info/10 px-2 py-0.5 font-mono text-[0.625rem] text-info">
              CEDED
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">Coverage</p>
            <p className="tabular mt-1.5 font-display text-2xl text-fg">{usd0(policy.coverageUsd)}</p>
          </div>
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">Premium</p>
            <p className="tabular mt-1.5 font-display text-2xl text-lime">{usd(policy.premiumUsd)}</p>
          </div>
        </div>

        <CedeBar coverageUsd={policy.coverageUsd} cededShare={cededShare} />

        <div className="space-y-2.5">
          <Meta label="Reliability at bind">{pct(policy.reliabilityBps / 10000, 1)}</Meta>
          <Meta label="Tenor">{durationLabel(tenorSeconds)}</Meta>
          <Meta label="Remaining">{isActive ? durationLabel(remaining) : "n/a"}</Meta>
          <Meta label="Bound">{agoLabel(boundAgo)}</Meta>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 font-mono text-[0.625rem]">
        <span className="truncate text-mist-dim">{shortHash(policy.intentId)}</span>
        <a
          href={explorerAddr(policy.holder)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-mist-dim hover:text-lime"
        >
          {shortAddr(policy.holder)}
          <ExternalLinkIcon />
        </a>
      </div>

      {isActive && (
        <div className="h-0.5 w-full bg-line" aria-hidden="true">
          <div className="h-full bg-lime" style={{ width: `${elapsed * 100}%` }} />
        </div>
      )}
    </article>
  );
}

/* ── section ────────────────────────────────────────────────── */

function RailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span>{label}</span>
      <span className="tabular text-fg">{children}</span>
    </div>
  );
}

export function PolicyBook() {
  const { policies, live } = usePolicies();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const inForce = policies.filter((p) => uiStatus(p) === "active").length;
  const discharged = policies.filter((p) => uiStatus(p) === "discharged").length;
  const premiumTotal = policies.reduce((s, p) => s + p.premiumUsd, 0);
  const coverTotal = policies.reduce((s, p) => s + p.coverageUsd, 0);

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
          <RailItem label="Policies written">{policies.length}</RailItem>
          <RailItem label="In force">{inForce}</RailItem>
          <div className="flex items-baseline gap-2.5">
            <span>Discharged</span>
            <span className="tabular text-danger">{discharged}</span>
          </div>
          <RailItem label="Premium collected">{usd0(premiumTotal)}</RailItem>
          <RailItem label="Cover written">{usd0(coverTotal)}</RailItem>
        </div>
      </Reveal>

      {policies.length === 0 ? (
        <div className="panel p-10 text-center text-sm text-mist">
          {live
            ? "No policies bound yet on this pool. Bound policies appear here as ERC-721 tokens."
            : "Connect a deployed PolicyPool (NEXT_PUBLIC_POLICY_POOL) to read the live policy book."}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy, i) => (
            <Reveal key={policy.id} delay={i * 60}>
              <PolicyCard policy={policy} nowSeconds={nowSeconds} />
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
