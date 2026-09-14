"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Ban, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ForecastOutput } from "@/lib/research/schema";
import { getPlatformName, type MarketPlatform } from "@/lib/tools/market-url-parser";
import { cn } from "@/lib/utils";

interface ForecastVerdictProps {
  forecast: ForecastOutput;
  marketUrl?: string;
  platform?: MarketPlatform;
}

const pct = (value: number | null | undefined, digits = 0) =>
  typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : null;

const SIDE = {
  YES: {
    label: "Buy YES",
    icon: ThumbsUp,
    ring: "border-emerald-400/60 bg-emerald-500/15 text-emerald-200",
    accent: "text-emerald-300",
  },
  NO: {
    label: "Buy NO",
    icon: ThumbsDown,
    ring: "border-rose-400/60 bg-rose-500/15 text-rose-200",
    accent: "text-rose-300",
  },
  NO_BET: {
    label: "No edge",
    icon: Ban,
    ring: "border-white/30 bg-white/10 text-white/85",
    accent: "text-white/80",
  },
} as const;

const CONFIDENCE = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
} as const;

function ProbabilityBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="text-base font-semibold tabular-nums text-white">{pct(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.span
          className={cn("block h-full rounded-full", tone)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(1, Math.min(100, value * 100))}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}

export function ForecastVerdict({ forecast, marketUrl, platform }: ForecastVerdictProps) {
  const side = SIDE[forecast.recommendation.side] || SIDE.NO_BET;
  const SideIcon = side.icon;
  const market = forecast.market_probability;
  const edge =
    typeof forecast.recommendation.edge === "number"
      ? forecast.recommendation.edge
      : typeof market === "number"
        ? forecast.probability - market
        : null;
  const edgeText = edge === null ? null : `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)} pts`;
  const range = forecast.probability_range;

  return (
    <motion.section
      aria-label="Forecast"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="p-5 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">Forecast</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">{forecast.question}</h1>

        <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className={cn("flex items-center gap-3 self-start rounded-2xl border px-5 py-4", side.ring)}>
            <SideIcon className="size-7" aria-hidden="true" />
            <div>
              <div className="text-lg font-semibold leading-none">{side.label}</div>
              <div className="mt-1 text-xs opacity-80">{CONFIDENCE[forecast.confidence] || "Confidence unknown"}</div>
            </div>
          </div>

          <div className="grid gap-4">
            <ProbabilityBar label="Polyseer probability of YES" value={forecast.probability} tone="bg-sky-400" />
            {typeof market === "number" && (
              <ProbabilityBar label="Market price for YES" value={market} tone="bg-white/40" />
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-white/50">Edge vs market</dt>
            <dd className={cn("mt-1 text-lg font-semibold tabular-nums", side.accent)}>{edgeText ?? "n/a"}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-white/50">Plausible range</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {range ? `${pct(range.low)} to ${pct(range.high)}` : "n/a"}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-white/50">Base rate</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{pct(forecast.base_rate?.value) ?? "n/a"}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-xs text-white/50">Resolves</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{forecast.resolution_date || "See rules"}</dd>
          </div>
        </dl>

        <p className="mt-6 text-[15px] leading-relaxed text-white/85">{forecast.summary}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/65">{forecast.recommendation.reasoning}</p>

        {marketUrl && (
          <a
            href={marketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          >
            Trade on {platform ? getPlatformName(platform) : "the market"}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="border-t border-white/10 bg-black/30 px-5 py-2.5 text-[11px] text-white/45 sm:px-7">
        Not financial advice. Probabilities are estimates and can be wrong.
      </div>
    </motion.section>
  );
}
