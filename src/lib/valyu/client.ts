/**
 * Server-side Valyu API client.
 *
 * Two transports, chosen by app mode:
 *   - valyu mode: every call goes through the Valyu Platform OAuth proxy with the
 *     signed-in user's access token, so their organisation's credits are charged.
 *   - self-hosted mode: calls hit the Valyu REST API directly with VALYU_API_KEY.
 *
 * In valyu mode there is deliberately no fallback to VALYU_API_KEY: a request
 * without a user token fails with 401 rather than silently billing the host.
 */

import { isSelfHostedMode } from "@/lib/local-db/local-auth";

const VALYU_API_BASE = process.env.VALYU_API_URL || "https://api.valyu.ai";
const VALYU_APP_URL =
  process.env.VALYU_APP_URL ||
  process.env.NEXT_PUBLIC_VALYU_APP_URL ||
  "https://platform.valyu.ai";
const VALYU_OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL || `${VALYU_APP_URL}/api/oauth/proxy`;

const REQUEST_TIMEOUT_MS = 25_000;

export type ValyuMethod = "GET" | "POST" | "DELETE";

export class ValyuError extends Error {
  status?: number;
  bodyText?: string;

  constructor(message: string, status?: number, bodyText?: string) {
    super(message);
    this.name = "ValyuError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

/**
 * Map an upstream error to the HTTP status an API route should return.
 * Keeps the statuses the client distinguishes (auth, credits, rate limit,
 * other 4xx) and collapses upstream faults to 502.
 */
export function valyuErrorStatus(error: ValyuError): number {
  const status = error.status;
  if (status === 402) return 402;
  if (status === 401 || status === 403) return 401;
  if (status && status >= 400 && status < 500) return status;
  return 502;
}

/** Transient errors are worth retrying: network blips, 5xx, rate limits. */
export function isTransientValyuError(error: unknown): boolean {
  if (!(error instanceof ValyuError)) return true;
  if (error.status === undefined) return true;
  return error.status >= 500 || error.status === 429;
}

export interface ValyuCallOptions {
  accessToken?: string;
}

/**
 * Low-level call. Returns parsed JSON, throws ValyuError on failure.
 */
export async function valyuCall<T = unknown>(
  path: string,
  method: ValyuMethod,
  body: unknown,
  { accessToken }: ValyuCallOptions = {}
): Promise<T> {
  let response: Response;

  if (isSelfHostedMode()) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new ValyuError("Set VALYU_API_KEY to run research in self-hosted mode.", 503);
    }
    response = await fetch(`${VALYU_API_BASE}${path}`, {
      method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } else {
    if (!accessToken) {
      throw new ValyuError("Sign in with Valyu to continue.", 401);
    }
    response = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, method, ...(body !== undefined ? { body } : {}) }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error body (for example an HTML 502 page).
  }

  if (!response.ok) {
    if (response.status === 402) {
      throw new ValyuError(
        "Your Valyu account needs credits. Add credits at platform.valyu.ai, then try again.",
        402,
        text
      );
    }
    if (response.status === 401) {
      throw new ValyuError("Your Valyu session expired. Please sign in again.", 401, text);
    }
    if (response.status === 403) {
      throw new ValyuError("This Valyu feature is not available for your account.", 403, text);
    }
    if (response.status === 429) {
      throw new ValyuError(
        "Valyu is handling too many requests. Wait a moment and try again.",
        429,
        text
      );
    }
    const message =
      json?.error?.message || json?.message || json?.error || `Valyu request failed (${response.status})`;
    throw new ValyuError(
      typeof message === "string" ? message : `Valyu request failed (${response.status})`,
      response.status,
      text
    );
  }

  return json as T;
}

/**
 * Resolve the signed-in user's email from the Valyu Platform userinfo endpoint.
 * Used for completion alerts, which must go to an address in the user's org.
 */
export async function fetchValyuUserEmail(accessToken: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${VALYU_APP_URL}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return undefined;
    const profile = (await response.json()) as { email?: unknown };
    return typeof profile.email === "string" ? profile.email : undefined;
  } catch {
    return undefined;
  }
}
