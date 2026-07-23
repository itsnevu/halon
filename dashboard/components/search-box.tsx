"use client";

import { useMemo, useRef, useState, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { searchCatalog } from "@/lib/search-index";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * Header search. Resolves the query against the static Tokens / Pools / Pages
 * catalog and shows a grouped dropdown; Enter (or a click) navigates to the
 * highlighted result, and a bare Enter with no highlight still falls through to
 * Explore's live token filter. Arrow keys move the highlight; Escape closes.
 */
export function SearchBox({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => searchCatalog(q), [q]);
  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  // Clamp the highlight whenever the result set shrinks.
  useEffect(() => {
    setActive((a) => (a >= flat.length ? 0 : a));
  }, [flat.length]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQ("");
    onNavigate?.();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (flat.length > 0) {
      go(flat[active]?.href ?? flat[0].href);
    } else {
      const query = q.trim();
      go(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && flat.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === "ArrowUp" && flat.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && q.trim().length > 0;
  let flatIdx = -1; // running index so highlight maps across groups

  return (
    <div ref={wrapRef} className={cn("relative", variant === "desktop" ? "group mr-2" : "w-full")}>
      <form onSubmit={submit} className="relative">
        <button
          type="submit"
          aria-label="Search"
          className={cn(
            "absolute inset-y-0 left-0 flex items-center text-mist transition-colors hover:text-lime",
            variant === "desktop" ? "pl-3 group-focus-within:text-lime" : "pl-4",
          )}
        >
          <SearchIcon />
        </button>
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search tokens, pools..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          autoComplete="off"
          className={
            variant === "desktop"
              ? "w-[190px] xl:w-[240px] rounded-full border border-line bg-surface-2 py-2 pl-9 pr-10 text-sm text-fg outline-none transition-all focus:border-lime/40 focus:bg-surface-3"
              : "w-full rounded-full border border-line bg-surface-2 py-3 pl-11 pr-4 text-sm text-fg outline-none transition-colors focus:border-lime/40"
          }
        />
        {variant === "desktop" && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="rounded border border-line bg-surface-3 px-1.5 py-0.5 text-xs text-mist">↵</span>
          </div>
        )}
      </form>

      {showDropdown && (
        <div
          id="search-results"
          role="listbox"
          className={cn(
            "absolute top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.95)]",
            variant === "desktop" ? "left-0 w-[min(22rem,90vw)]" : "w-full",
          )}
        >
          {flat.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-mist">
              No matches. Press <span className="text-fg">↵</span> to search Explore for “{q.trim()}”.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {groups.map((g) => (
                <div key={g.group}>
                  <div className="px-4 pt-2 pb-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-mist-dim">
                    {g.group}
                  </div>
                  {g.entries.map((entry) => {
                    flatIdx += 1;
                    const idx = flatIdx;
                    return (
                      <button
                        key={`${entry.group}-${entry.href}-${entry.label}`}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(entry.href)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors",
                          idx === active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                        )}
                      >
                        <span className="min-w-0 truncate text-sm text-fg">{entry.label}</span>
                        {entry.sub && (
                          <span className="shrink-0 font-mono text-[0.6875rem] text-mist-dim">{entry.sub}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
