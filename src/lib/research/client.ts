/**
 * Browser-side helpers for the research API routes.
 *
 * In valyu mode every call carries the user's Valyu access token so the
 * server can bill their organisation. In self-hosted mode no token is needed.
 */

import { getValidAccessToken } from "@/lib/valyu-oauth";
import type { ResearchEffort } from "./effort";
import type { ResearchSummary, ResearchTask } from "./task";

export const isSelfHostedApp = process.env.NEXT_PUBLIC_APP_MODE !== "valyu";

export class ResearchApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ResearchApiError";
  }

  get isAuth() {
    return this.status === 401;
  }

  get isCredits() {
    return this.status === 402;
  }

  get isTransient() {
    return this.status === 503 || this.status === 429 || this.status >= 500;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (isSelfHostedApp) return {};
  const token = await getValidAccessToken();
  return token ? { "x-valyu-token": token } : {};
}

async function readError(response: Response, fallback: string): Promise<ResearchApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  const message =
    response.status === 401
      ? body.message || "Sign in with Valyu to continue."
      : response.status === 402
        ? body.message || "Your Valyu account needs credits. Add credits at platform.valyu.ai."
        : response.status === 429
          ? body.message || "Too many requests. Wait a moment and try again."
          : body.message || fallback;
  return new ResearchApiError(response.status, body.error || "REQUEST_FAILED", message);
}

export interface StartedResearch {
  id: string;
  status: string;
  question: string;
  notified: boolean;
}

export async function startResearch(marketUrl: string, effort: ResearchEffort): Promise<StartedResearch> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ marketUrl, effort }),
  });
  if (!response.ok) throw await readError(response, "The research could not start. Please try again.");
  const data = (await response.json()) as { research: StartedResearch };
  return data.research;
}

export async function fetchResearch(id: string, signal?: AbortSignal): Promise<ResearchTask> {
  const response = await fetch(`/api/research/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await readError(response, "Could not load this research.");
  const data = (await response.json()) as { task: ResearchTask };
  return data.task;
}

export async function fetchResearchHistory(): Promise<ResearchSummary[]> {
  const response = await fetch("/api/research", { headers: await authHeaders(), cache: "no-store" });
  if (!response.ok) throw await readError(response, "Could not load your research history.");
  const data = (await response.json()) as { tasks: ResearchSummary[] };
  return data.tasks;
}

export async function cancelResearch(id: string): Promise<ResearchTask> {
  const response = await fetch(`/api/research/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!response.ok) throw await readError(response, "Could not cancel this research.");
  const data = (await response.json()) as { task: ResearchTask };
  return data.task;
}

/** Fetch a deliverable through the app and hand it to the browser as a download. */
export async function downloadDeliverable(id: string, fileId: string, filename: string): Promise<void> {
  const response = await fetch(
    `/api/research/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
    { headers: await authHeaders() }
  );
  if (!response.ok) throw await readError(response, "Could not download this file.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
