"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, FileText, LoaderCircle, Pause, Search, WifiOff } from "lucide-react";
import { effortDetails } from "@/lib/research/effort";
import type { ResearchTask } from "@/lib/research/task";
import { cn } from "@/lib/utils";

export type ResearchConnection = "live" | "reconnecting";

function useElapsed(since?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const start = since ? Date.parse(since) : NaN;
  const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
    : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ResearchProgress({
  task,
  connection = "live",
}: {
  task: ResearchTask;
  connection?: ResearchConnection;
}) {
  const elapsed = useElapsed(task.createdAt);
  const queued = task.status === "queued";
  const paused = task.status === "paused" || task.status === "awaiting_input";
  const reconnecting = connection === "reconnecting";
  const active = !paused && !reconnecting;
  const effort = effortDetails(task.effort);
  const percent = task.progress?.percent;

  const title = reconnecting
    ? "Reconnecting"
    : paused
      ? "Research paused"
      : queued
        ? "Waiting to start"
        : "Researching this market";
  const description = reconnecting
    ? "Updates are interrupted. Reconnecting automatically."
    : paused
      ? "Open this task on the Valyu platform to continue."
      : queued
        ? "Your research is in the queue and will begin shortly."
        : effort
          ? `${effort.label} effort usually takes ${effort.estimate.toLowerCase()}. Steps stream in below.`
          : "Searching sources and weighing the evidence.";
  const Icon = reconnecting ? WifiOff : paused ? Pause : queued ? Clock3 : Search;

  return (
    <section
      aria-label="Research progress"
      className="rounded-2xl border border-white/20 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex size-12 shrink-0 items-center justify-center" aria-hidden="true">
          <LoaderCircle
            className={cn("absolute inset-0 size-12 text-white/25", active && "animate-[spin_2.2s_linear_infinite] text-sky-400/70")}
            strokeWidth={1}
          />
          <Icon className="size-5" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="mt-1 text-sm text-white/65">{description}</p>
        </div>
        <span className="shrink-0 pt-1 text-sm text-white/60 tabular-nums" aria-label={`${elapsed} elapsed`}>
          {elapsed}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/55 tabular-nums">
        <span>
          {task.progress
            ? `Step ${task.progress.currentStep} of ${task.progress.totalSteps}`
            : queued
              ? "Queued"
              : "In progress"}
        </span>
        {percent !== undefined && <span>{percent}%</span>}
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Research steps completed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span
          className={cn(
            "block h-full rounded-full bg-sky-400 transition-[width] duration-700",
            percent === undefined && active && "w-[30%] animate-[progress-sweep_1.6s_ease-in-out_infinite]"
          )}
          style={percent !== undefined ? { width: `${percent}%` } : undefined}
        />
      </div>

      <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/55" aria-label="Report lifecycle">
        <li className="flex items-center gap-1.5 text-white/85">
          <Check className="size-3.5" aria-hidden="true" /> Queued
        </li>
        <li className={cn("flex items-center gap-1.5", !queued && "text-white/85")}>
          {!queued && active ? (
            <LoaderCircle className="size-3.5 animate-spin text-sky-300" aria-hidden="true" />
          ) : (
            <span className="size-3.5 rounded-full border border-current" aria-hidden="true" />
          )}
          Researching
        </li>
        <li className="flex items-center gap-1.5">
          <FileText className="size-3.5" aria-hidden="true" /> Forecast ready
        </li>
      </ol>

      <p className="mt-4 flex items-center gap-2 text-xs text-white/50">
        <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        You can leave this page. Your forecast is saved to this link and in your history.
      </p>
    </section>
  );
}
