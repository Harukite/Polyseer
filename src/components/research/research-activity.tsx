"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Lightbulb,
  LoaderCircle,
  PenLine,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { ActivitySource, ActivityStep } from "@/lib/research/activity";
import { cn } from "@/lib/utils";
import { SourceFavicon, sourceHost } from "./source-favicon";

const ICONS = {
  thought: Lightbulb,
  search: Search,
  read: BookOpen,
  write: PenLine,
  tool: Wrench,
} as const;

const RECENT = 6;

function SourceLinks({ sources }: { sources: ActivitySource[] }) {
  return (
    <div className="mt-2 grid gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10"
        >
          <SourceFavicon url={source.url} size={14} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-white/90">{source.title}</span>
            <span className="block truncate text-[11px] text-white/45">{sourceHost(source.url)}</span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-white/40" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function Step({ step, live }: { step: ActivityStep; live: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[step.type];
  const running = step.status === "running" && live;
  const isProse = step.type === "thought" || step.type === "write";
  const long = isProse && (step.detail?.length || 0) > 220;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("relative flex gap-3 pb-5", "before:absolute before:bottom-1 before:left-[15px] before:top-8 before:w-px before:bg-white/15 last:before:hidden")}
    >
      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50",
          running ? "text-sky-300" : step.status === "failed" ? "text-amber-300" : "text-white/70"
        )}
        aria-hidden="true"
      >
        {running ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-white">{step.title}</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/45">
            {running ? (
              "In progress"
            ) : step.status === "failed" ? (
              <>
                <TriangleAlert className="size-3" /> No result
              </>
            ) : (
              <>
                <Check className="size-3" /> Done
              </>
            )}
          </span>
        </div>
        {step.detail && (
          <p
            className={cn(
              "mt-1 text-[13px] leading-relaxed text-white/65 [overflow-wrap:anywhere]",
              isProse && !open && "line-clamp-3"
            )}
          >
            {step.detail}
          </p>
        )}
        {long && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-1 text-xs text-sky-300 hover:text-sky-200"
          >
            {open ? "Show less" : "Show more"}
          </button>
        )}
        {step.sources.length > 0 && <SourceLinks sources={step.sources} />}
      </div>
    </motion.li>
  );
}

export function ResearchActivity({
  steps,
  live,
  defaultOpen = true,
}: {
  steps: ActivityStep[];
  live: boolean;
  defaultOpen?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  if (steps.length === 0) return null;

  const visible = showAll ? steps : steps.slice(-RECENT);
  const hidden = steps.length - visible.length;
  const sourceCount = new Set(steps.flatMap((step) => step.sources.map((source) => source.url))).size;

  return (
    <section
      aria-label="Research activity"
      className="rounded-2xl border border-white/20 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md sm:p-5"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-base font-medium">
          <Search className="size-4 text-white/70" aria-hidden="true" />
          Research activity
        </span>
        <span className="flex items-center gap-3 text-xs text-white/55 tabular-nums">
          {steps.length} {steps.length === 1 ? "step" : "steps"} · {sourceCount} {sourceCount === 1 ? "source" : "sources"}
          {live && (
            <span className="flex items-center gap-1.5 text-sky-300">
              <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
              Live
            </span>
          )}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-4 flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
              >
                <ChevronDown className="size-3.5 rotate-180" aria-hidden="true" />
                Show {hidden} earlier {hidden === 1 ? "step" : "steps"}
              </button>
            )}
            <ol className="mt-4">
              {visible.map((step) => (
                <Step key={step.id} step={step} live={live} />
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
