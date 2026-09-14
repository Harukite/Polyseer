/**
 * Server-side research operations: create, read, list, cancel.
 */

import { valyuCall, type ValyuCallOptions } from "@/lib/valyu/client";
import { fetchMarketDataFromUrl } from "@/lib/tools/market-fetcher";
import { parseMarketUrl } from "@/lib/tools/market-url-parser";
import { RequestError } from "@/lib/server/http";
import type { ResearchEffort } from "./effort";
import type { ResearchNotification } from "./notification";
import { buildForecastRequest } from "./prompt";
import { forecastOutputSchema } from "./schema";
import {
  deliverableUrlFromStatus,
  summaryFromListItem,
  taskFromStatus,
  type ResearchSummary,
  type ResearchTask,
} from "./task";

const TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_LIMIT = 100;

export function assertTaskId(id: string): void {
  if (!TASK_ID_PATTERN.test(id)) {
    throw new RequestError(400, "This research ID is invalid.", "INVALID_INPUT");
  }
}

export interface CreateForecastInput {
  marketUrl: string;
  effort: ResearchEffort;
  notification?: ResearchNotification;
}

export interface CreatedForecast {
  id: string;
  status: string;
  question: string;
  notified: boolean;
}

export async function createForecastTask(
  input: CreateForecastInput,
  options: ValyuCallOptions
): Promise<CreatedForecast> {
  const parsed = parseMarketUrl(input.marketUrl);
  if (!parsed.valid) {
    throw new RequestError(
      400,
      parsed.error || "Paste a Polymarket or Kalshi market URL.",
      "INVALID_INPUT"
    );
  }

  let payload;
  try {
    payload = await fetchMarketDataFromUrl(parsed.url, { historyInterval: "1d", withBooks: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new RequestError(
      400,
      `Could not load this market from ${parsed.platform === "kalshi" ? "Kalshi" : "Polymarket"}. Check the URL and try again.${
        message ? ` (${message.slice(0, 160)})` : ""
      }`,
      "MARKET_UNAVAILABLE"
    );
  }

  const request = buildForecastRequest(parsed.url, parsed.platform, payload);
  const body: Record<string, unknown> = {
    query: request.query,
    mode: input.effort,
    research_strategy: request.research_strategy,
    output_formats: [forecastOutputSchema],
    deliverables: request.deliverables,
    metadata: {
      app: "polyseer",
      platform: parsed.platform,
      market_url: parsed.url,
      effort: input.effort,
    },
    ...(input.notification ? { alert_email: input.notification } : {}),
  };

  const result = await valyuCall<Record<string, unknown>>("/v1/deepresearch/tasks", "POST", body, options);
  const id = typeof result?.deepresearch_id === "string" ? result.deepresearch_id : undefined;
  if (!id) {
    throw new RequestError(502, "Valyu did not return a research task.", "PROVIDER_ERROR");
  }

  return {
    id,
    status: typeof result.status === "string" ? result.status : "queued",
    question: payload.market_facts.question,
    notified: Boolean(input.notification),
  };
}

export async function getResearchTask(id: string, options: ValyuCallOptions): Promise<ResearchTask> {
  assertTaskId(id);
  const raw = await valyuCall(`/v1/deepresearch/tasks/${id}/status`, "GET", undefined, options);
  return taskFromStatus(raw, id);
}

export async function listResearchTasks(options: ValyuCallOptions): Promise<ResearchSummary[]> {
  const raw = await valyuCall<unknown>(`/v1/deepresearch/list?limit=${LIST_LIMIT}`, "GET", undefined, options);
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.data)
      ? ((raw as Record<string, unknown>).data as unknown[])
      : [];
  const summaries = rows
    .map(summaryFromListItem)
    .filter((item): item is ResearchSummary => Boolean(item));
  const unique = [...new Map(summaries.map((item) => [item.id, item])).values()];
  unique.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return unique;
}

export async function cancelResearchTask(id: string, options: ValyuCallOptions): Promise<void> {
  assertTaskId(id);
  await valyuCall(`/v1/deepresearch/tasks/${id}/cancel`, "POST", {}, options);
}

export async function getDeliverableUrl(
  id: string,
  deliverableId: string,
  options: ValyuCallOptions
): Promise<string | undefined> {
  assertTaskId(id);
  const raw = await valyuCall(`/v1/deepresearch/tasks/${id}/status`, "GET", undefined, options);
  return deliverableUrlFromStatus(raw, deliverableId);
}
