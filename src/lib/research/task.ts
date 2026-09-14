/**
 * Normalises DeepResearch API responses into the shapes the UI consumes.
 */

import { activityFromMessages, activitySources, type ActivityStep, type ActivitySource } from "./activity";
import { effortDetails, type ResearchEffort } from "./effort";
import { isForecastQuery, parseForecastQuery } from "./prompt";
import { parseForecastOutput, type ForecastOutput } from "./schema";
import type { MarketPlatform } from "@/lib/tools/market-url-parser";

export type ResearchStatus =
  | "queued"
  | "running"
  | "awaiting_input"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export const ACTIVE_STATUSES: ReadonlySet<ResearchStatus> = new Set([
  "queued",
  "running",
  "awaiting_input",
  "paused",
  "unknown",
]);

export interface ResearchMarket {
  question?: string;
  marketUrl?: string;
  platform?: MarketPlatform;
}

export interface ResearchDeliverable {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: "completed" | "failed";
  rowCount?: number;
}

export interface ResearchSource extends ActivitySource {
  snippet?: string;
}

export interface ResearchTask {
  id: string;
  status: ResearchStatus;
  title?: string;
  market: ResearchMarket;
  effort?: ResearchEffort;
  progress?: { currentStep: number; totalSteps: number; percent: number };
  activity: ActivityStep[];
  sources: ResearchSource[];
  forecast?: ForecastOutput;
  deliverables: ResearchDeliverable[];
  cost?: number;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ResearchSummary {
  id: string;
  status: ResearchStatus;
  title: string;
  market: ResearchMarket;
  createdAt?: string;
}

const STATUSES = new Set<ResearchStatus>([
  "queued",
  "running",
  "awaiting_input",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const ms = typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined;
}

function parseStatus(value: unknown): ResearchStatus {
  return typeof value === "string" && STATUSES.has(value as ResearchStatus)
    ? (value as ResearchStatus)
    : "unknown";
}

function parseOutput(value: unknown): ForecastOutput | undefined {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
  return parseForecastOutput(candidate);
}

function parseDeliverables(value: unknown): ResearchDeliverable[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => record(raw))
    .filter((item) => text(item.id) && text(item.url))
    .map((item) => ({
      id: String(item.id),
      type: String(item.type || "unknown").toLowerCase(),
      title: text(item.title) || `${String(item.type || "file").toUpperCase()} deliverable`,
      description: text(item.description),
      status: item.status === "failed" ? "failed" : "completed",
      rowCount: typeof item.row_count === "number" ? item.row_count : undefined,
    }));
}

function parseSources(value: unknown): ResearchSource[] {
  const base = activitySources(value, 300);
  if (!Array.isArray(value)) return base;
  const snippets = new Map<string, string>();
  for (const raw of value) {
    const source = record(raw);
    const url = text(source.url);
    const snippet = text(source.snippet) || text(source.description);
    if (url && snippet) snippets.set(url, snippet.slice(0, 360));
  }
  return base.map((source) => ({ ...source, snippet: snippets.get(source.url) }));
}

/** Shape a `/status` response for the UI. */
export function taskFromStatus(raw: unknown, fallbackId?: string): ResearchTask {
  const task = record(raw);
  const status = parseStatus(task.status);
  const progressRecord = record(task.progress);
  const currentStep = Number(progressRecord.current_step ?? progressRecord.currentStep ?? 0);
  const totalSteps = Number(progressRecord.total_steps ?? progressRecord.totalSteps ?? 0);
  const progress =
    status === "completed"
      ? { currentStep: totalSteps || currentStep, totalSteps: totalSteps || currentStep, percent: 100 }
      : totalSteps > 0
        ? {
            currentStep,
            totalSteps,
            percent: Math.min(99, Math.round((currentStep / totalSteps) * 100)),
          }
        : undefined;

  const query = text(task.query) || text(task.input);
  const market = parseForecastQuery(query);
  const forecast = status === "completed" ? parseOutput(task.output) : undefined;

  return {
    id: text(task.deepresearch_id) || fallbackId || "",
    status,
    title: text(task.title) || market.question,
    market,
    effort: effortDetails(text(task.mode))?.value,
    progress,
    activity: activityFromMessages(task.messages, status),
    sources: parseSources(task.sources),
    forecast,
    deliverables: parseDeliverables(task.deliverables),
    cost: typeof task.cost === "number" ? task.cost : undefined,
    createdAt: isoDate(task.created_at),
    completedAt: isoDate(task.completed_at),
    error:
      status === "failed"
        ? text(task.error) || text(task.error_message) || "The research task failed."
        : undefined,
  };
}

/** Shape one row of `/list` for the history view. Returns undefined for tasks from other apps. */
export function summaryFromListItem(raw: unknown): ResearchSummary | undefined {
  const item = record(raw);
  const id = text(item.deepresearch_id);
  const query = text(item.query) || text(item.input);
  if (!id || !isForecastQuery(query)) return undefined;
  const market = parseForecastQuery(query);
  return {
    id,
    status: parseStatus(item.status),
    title: market.question || text(item.title) || "Market forecast",
    market,
    createdAt: isoDate(item.created_at),
  };
}

/** Deliverable download URLs are token-signed; keep them server-side. */
export function deliverableUrlFromStatus(raw: unknown, deliverableId: string): string | undefined {
  const task = record(raw);
  if (!Array.isArray(task.deliverables)) return undefined;
  const match = task.deliverables.map((d) => record(d)).find((d) => d.id === deliverableId);
  return text(match?.url);
}
