"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { ResearchSource } from "@/lib/research/task";
import { cn } from "@/lib/utils";
import { SourceFavicon, sourceHost } from "./source-favicon";

const INITIAL = 12;

export function ResearchSources({ sources }: { sources: ResearchSource[] }) {
  const [showAll, setShowAll] = useState(false);
  if (sources.length === 0) return null;
  const visible = showAll ? sources : sources.slice(0, INITIAL);

  return (
    <section
      id="sources"
      aria-label="Sources"
      className="rounded-2xl border border-white/20 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md sm:p-5"
    >
      <h2 className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-wider text-white/70">
        Sources
        <span className="text-xs font-normal normal-case tracking-normal text-white/50 tabular-nums">
          {sources.length} consulted
        </span>
      </h2>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {visible.map((source, index) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/10"
            >
              <span className="w-5 shrink-0 pt-0.5 text-right text-[11px] text-white/35 tabular-nums">{index + 1}</span>
              <SourceFavicon url={source.url} size={14} className="mt-1" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90">{source.title}</span>
                <span className="block truncate text-[11px] text-white/45">{sourceHost(source.url)}</span>
              </span>
              <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-white/35" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      {sources.length > INITIAL && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-3 flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
          {showAll ? "Show fewer" : `Show all ${sources.length}`}
        </button>
      )}
    </section>
  );
}
