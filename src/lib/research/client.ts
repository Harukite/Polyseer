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
}

/** Shown when the server sends no message of its own. */
const STATUS_MESSAGES: Record<number, string> = {
  401: "Sign in with Valyu to continue.",
  402: "Your Valyu account needs credits. Add credits at platform.valyu.ai.",
  429: "Too many requests. Wait a moment and try again.",
};

/**
 * The token rides in the JSON body rather than a header: with session cookies
 * present, a header pushes requests past the server's header size limit.
 */
async function withToken(fields: Record<string, unknown> = {}): Promise<RequestInit> {
  const token = isSelfHostedApp ? null : await getValidAccessToken();
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(token ? { ...fields, valyuAccessToken: token } : fields),
  };
}

async function readError(response: Response, fallback: string): Promise<ResearchApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  const message = body.message || STATUS_MESSAGES[response.status] || fallback;
  return new ResearchApiError(response.status, body.error || "REQUEST_FAILED", message);
}

export interface StartedResearch {
  id: string;
  status: string;
  question: string;
  notified: boolean;
}

export async function startResearch(marketUrl: string, effort: ResearchEffort): Promise<StartedResearch> {
  const response = await fetch("/api/research", await withToken({ marketUrl, effort }));
  if (!response.ok) throw await readError(response, "The research could not start. Please try again.");
  const data = (await response.json()) as { research: StartedResearch };
  return data.research;
}

export async function fetchResearch(id: string, signal?: AbortSignal): Promise<ResearchTask> {
  const response = await fetch(`/api/research/${encodeURIComponent(id)}`, {
    ...(await withToken()),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await readError(response, "Could not load this research.");
  const data = (await response.json()) as { task: ResearchTask };
  return data.task;
}

export async function fetchResearchHistory(): Promise<ResearchSummary[]> {
  const response = await fetch("/api/research/list", { ...(await withToken()), cache: "no-store" });
  if (!response.ok) throw await readError(response, "Could not load your research history.");
  const data = (await response.json()) as { tasks: ResearchSummary[] };
  return data.tasks;
}

export async function cancelResearch(id: string): Promise<ResearchTask> {
  const response = await fetch(`/api/research/${encodeURIComponent(id)}/cancel`, await withToken());
  if (!response.ok) throw await readError(response, "Could not cancel this research.");
  const data = (await response.json()) as { task: ResearchTask };
  return data.task;
}

/** Fetch a deliverable through the app and hand it to the browser as a download. */
export async function downloadDeliverable(id: string, fileId: string, filename: string): Promise<void> {
  const response = await fetch(
    `/api/research/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
    await withToken()
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
