/**
 * Builds the DeepResearch request for a prediction market.
 *
 * The query carries the live market facts (question, prices, close time,
 * resolution rules) so the agent researches the right market and anchors on
 * the current price. The research strategy encodes the forecasting method.
 */

import type { MarketPayload } from "@/lib/tools/market-fetcher";
import { getPlatformName, type MarketPlatform } from "@/lib/tools/market-url-parser";

/** First line of every query. Used to recognise Polyseer tasks in the task list. */
export const QUERY_PREFIX = "Prediction market forecast: ";
export const MARKET_URL_LINE = "Market URL: ";

export interface ForecastRequest {
  query: string;
  research_strategy: string;
  deliverables: Array<{ type: "csv" | "pdf"; description: string; columns?: string[] }>;
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | number | undefined): string {
  if (value === undefined || value === null) return "unknown";
  const date = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function formatMoney(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function outcomeLines(payload: MarketPayload): string[] {
  const outcomes = payload.market_state_now.map((entry) => {
    const name = entry.outcome || entry.token_id;
    return `- ${name}: ${formatPercent(entry.mid)} (bid ${formatPercent(entry.bid)}, ask ${formatPercent(entry.ask)})`;
  });
  return outcomes.length ? outcomes : ["- Prices unavailable"];
}

function trendLine(payload: MarketPayload): string | null {
  const series = payload.history[0];
  if (!series || series.points.length < 2) return null;
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const outcome = payload.market_state_now.find((entry) => entry.token_id === series.token_id)?.outcome || "the first outcome";
  return `Price trend for ${outcome}: ${formatPercent(first.p)} on ${formatDate(first.t)} to ${formatPercent(last.p)} on ${formatDate(last.t)}.`;
}

function candidateLines(payload: MarketPayload): string[] {
  const summary = payload.event_summary;
  if (!summary?.is_multi_candidate) return [];
  const lines = summary.top_candidates
    .slice(0, 10)
    .map((candidate) => `- ${candidate.name}: ${formatPercent(candidate.implied_probability)} implied`);
  return [
    "",
    `This is a multi-outcome event with ${summary.active_markets} active markets. The leading outcomes are:`,
    ...lines,
    "Forecast the specific market above (the leading outcome), and fill `outcomes` with your probability for each leading outcome.",
  ];
}

export function buildForecastQuery(
  marketUrl: string,
  platform: MarketPlatform,
  payload: MarketPayload
): string {
  const facts = payload.market_facts;
  const yesPrice = payload.market_state_now[0]?.mid;
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    `${QUERY_PREFIX}${facts.question}`,
    `${MARKET_URL_LINE}${marketUrl}`,
    `Platform: ${getPlatformName(platform)}`,
    `Today's date: ${today}`,
    `Market closes or resolves: ${formatDate(facts.close_time)}`,
    `Current market-implied probability of YES: ${formatPercent(yesPrice)}`,
    "",
    "Current prices by outcome:",
    ...outcomeLines(payload),
  ];

  const trend = trendLine(payload);
  if (trend) lines.push("", trend);

  lines.push(
    "",
    `Volume: ${formatMoney(facts.volume)}. Liquidity: ${formatMoney(facts.liquidity)}.`
  );
  if (facts.resolution_source) lines.push(`Resolution source: ${facts.resolution_source}`);
  if (facts.rules) lines.push("", "Resolution rules:", facts.rules.slice(0, 4000));

  lines.push(...candidateLines(payload));

  lines.push(
    "",
    "Task: produce a calibrated probability that this market resolves YES, decide which side has positive expected value against the current price, and explain what evidence drives the number.",
    "Research this exact market and resolution window. Markets with similar names exist for other dates; do not confuse them."
  );

  return lines.join("\n").slice(0, 25_000);
}

export const FORECAST_RESEARCH_STRATEGY = `You are a superforecaster analysing a prediction market. Work like a calibrated analyst, not a commentator.

Method:
1. Pin down resolution. Restate exactly what resolves YES, by when, and who decides. Note any ambiguity that could flip the outcome.
2. Outside view first. Find a reference class and its base rate before reading the news. Say how often events like this happen.
3. Inside view. Gather the latest primary evidence: official statements, filings, data releases, polls, schedules, and on-the-record reporting. Prefer primary sources and the resolution source itself over commentary.
4. Search both sides. Actively look for the strongest evidence that the market is wrong in each direction. Record evidence against your emerging view with the same care as evidence for it.
5. Map the catalysts. List every scheduled event before resolution that could move the probability, with dates.
6. Respect the market. The current price aggregates informed traders. Only deviate when you can name the specific information or mispricing that justifies it, and size the deviation to the strength of that evidence.
7. Calibrate. Extreme probabilities need extreme evidence. Give a range, not just a point, and say what would change your mind.
8. Decide. Recommend YES, NO, or NO_BET based on your probability versus the market price. Small edges inside your own uncertainty band are NO_BET.

Use prediction market data sources to check related markets and price history. Cite the sources behind every key claim with their URLs and dates. Dates matter: check that each source is current relative to today's date and the resolution window.`;

export const FORECAST_DELIVERABLES: ForecastRequest["deliverables"] = [
  {
    type: "csv",
    description:
      "Every event, news item, data release, and factor affecting this market: what it is, which side it supports, how strongly, when it happened or will happen, and the source.",
    columns: [
      "factor",
      "description",
      "direction",
      "weight_1_to_5",
      "date",
      "source_title",
      "source_url",
    ],
  },
  {
    type: "pdf",
    description:
      "Full research report. Open with the predicted outcome, probability, and recommended side. Then cover resolution criteria, base rate, evidence for and against, catalysts, what would change the forecast, risks, and a cited source list.",
  },
];

export function buildForecastRequest(
  marketUrl: string,
  platform: MarketPlatform,
  payload: MarketPayload
): ForecastRequest {
  return {
    query: buildForecastQuery(marketUrl, platform, payload),
    research_strategy: FORECAST_RESEARCH_STRATEGY,
    deliverables: FORECAST_DELIVERABLES,
  };
}

/** Pull the market URL and question back out of a stored query. */
export function parseForecastQuery(query: string | null | undefined): {
  question?: string;
  marketUrl?: string;
  platform?: MarketPlatform;
} {
  if (!query || !query.startsWith(QUERY_PREFIX)) return {};
  const lines = query.split("\n");
  const question = lines[0].slice(QUERY_PREFIX.length).trim() || undefined;
  const urlLine = lines.find((line) => line.startsWith(MARKET_URL_LINE));
  const marketUrl = urlLine?.slice(MARKET_URL_LINE.length).trim() || undefined;
  const platform = marketUrl?.includes("kalshi.com")
    ? "kalshi"
    : marketUrl?.includes("polymarket.com")
      ? "polymarket"
      : undefined;
  return { question, marketUrl, platform };
}

export function isForecastQuery(query: unknown): query is string {
  return typeof query === "string" && query.startsWith(QUERY_PREFIX);
}
