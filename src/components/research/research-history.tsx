"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { fetchResearchHistory, isSelfHostedApp, ResearchApiError } from "@/lib/research/client";
import type { ResearchStatus, ResearchSummary } from "@/lib/research/task";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { getPlatformName } from "@/lib/tools/market-url-parser";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

const STATUS: Record<ResearchStatus, { label: string; icon: typeof Clock; tone: string; spin?: boolean }> = {
  queued: { label: "Queued", icon: Clock, tone: "text-white/60 bg-white/10" },
  running: { label: "Researching", icon: LoaderCircle, tone: "text-sky-200 bg-sky-500/20", spin: true },
  awaiting_input: { label: "Needs input", icon: Clock, tone: "text-amber-200 bg-amber-500/20" },
  paused: { label: "Paused", icon: Clock, tone: "text-amber-200 bg-amber-500/20" },
  completed: { label: "Complete", icon: CheckCircle2, tone: "text-emerald-200 bg-emerald-500/20" },
  failed: { label: "Failed", icon: AlertCircle, tone: "text-rose-200 bg-rose-500/20" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "text-white/60 bg-white/10" },
  unknown: { label: "Unknown", icon: Clock, tone: "text-white/60 bg-white/10" },
};

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlatformMark({ platform, className }: { platform?: "polymarket" | "kalshi"; className?: string }) {
  const src =
    platform === "kalshi"
      ? "https://kalshi.com/logo192.png"
      : platform === "polymarket"
        ? "https://www.google.com/s2/favicons?domain=polymarket.com&sz=32"
        : null;
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={platform ? getPlatformName(platform) : ""} className="size-4 rounded-sm" />
      ) : (
        <span className="size-2 rounded-full bg-white/40" aria-hidden="true" />
      )}
    </span>
  );
}

export function ResearchHistoryList({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const [tasks, setTasks] = useState<ResearchSummary[] | null>(null);
  const [error, setError] = useState<ResearchApiError | Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const signedOut = !isSelfHostedApp && initialized && !user;

  useEffect(() => {
    if (signedOut) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const next = await fetchResearchHistory();
        if (cancelled) return;
        setTasks(next);
        setError(null);
        if (next.some((task) => task.status === "queued" || task.status === "running")) {
          timer = window.setTimeout(load, REFRESH_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Could not load history."));
        setTasks((current) => current ?? []);
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signedOut, user?.id, refreshing]);

  if (signedOut) {
    return (
      <div className="rounded-2xl border border-white/20 bg-black/45 p-6 text-center text-white shadow-xl backdrop-blur-md">
        <p className="text-sm text-white/70">Sign in with Valyu to see your forecasts.</p>
        <Button onClick={() => setAuthOpen(true)} className="mt-4 bg-white text-black hover:bg-white/90">
          Sign in with Valyu
        </Button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  if (tasks === null) {
    return (
      <div className="grid gap-2" aria-busy="true">
        {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/10" />
        ))}
      </div>
    );
  }

  const visible = limit ? tasks.slice(0, limit) : tasks;

  return (
    <div>
      {error && (
        <p className="mb-3 flex items-center gap-2 text-sm text-rose-200">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error.message}
        </p>
      )}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-black/45 p-6 text-center text-sm text-white/65 shadow-xl backdrop-blur-md">
          No forecasts yet. Paste a Polymarket or Kalshi URL to start one.
        </div>
      ) : (
        <ul className="grid gap-2">
          {visible.map((task) => {
            const status = STATUS[task.status] || STATUS.unknown;
            const Icon = status.icon;
            return (
              <li key={task.id}>
                <Link
                  href={`/research/${task.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10",
                    compact ? "p-2.5" : "p-3.5"
                  )}
                >
                  <PlatformMark platform={task.market.platform} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-medium leading-snug", compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-[15px]")}>
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/50">
                      {formatDate(task.createdAt)}
                      {task.market.platform ? ` · ${getPlatformName(task.market.platform)}` : ""}
                    </span>
                  </span>
                  <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", status.tone)}>
                    <Icon className={cn("size-3", status.spin && "animate-spin")} aria-hidden="true" />
                    {status.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!compact && (
        <button
          type="button"
          onClick={() => setRefreshing(true)}
          disabled={refreshing}
          className="mt-4 flex items-center gap-1.5 text-xs text-white/55 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden="true" />
          Refresh
        </button>
      )}
    </div>
  );
}
