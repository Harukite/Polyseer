import { NextResponse } from "next/server";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { ValyuError, valyuErrorStatus } from "@/lib/valyu/client";

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED"
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export function appOrigin(request: Request): string {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
}

/** Reject cross-site POSTs so a third-party page cannot spend a user's credits. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = new URL(request.url).origin;
  if (
    (origin && origin !== appOrigin(request) && origin !== requestOrigin) ||
    fetchSite === "cross-site"
  ) {
    throw new RequestError(403, "This request must come from this app.", "INVALID_ORIGIN");
  }
}

export async function readJson(request: Request, maxBytes = 16_000): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) {
    throw new RequestError(413, "The request is too large.");
  }
  const body = await request.text();
  if (body.length > maxBytes) throw new RequestError(413, "The request is too large.");
  try {
    return JSON.parse(body);
  } catch {
    throw new RequestError(400, "Send a valid JSON request.");
  }
}

/**
 * Read a research request: its JSON body (for POST) and the signed-in user's
 * Valyu access token. The token travels in the body as `valyuAccessToken`
 * (a header would push requests past the header size limit once session
 * cookies are present); an `x-valyu-token` header is accepted for API use.
 * The token is required in valyu mode so the right organisation is billed;
 * self-hosted mode uses the host's API key and needs none.
 */
export async function readResearchRequest(
  request: Request,
  message: string
): Promise<{ body: Record<string, unknown>; accessToken?: string }> {
  const body =
    request.method === "POST"
      ? ((await readJson(request).catch(() => ({}))) as Record<string, unknown>)
      : {};
  const fromBody = typeof body.valyuAccessToken === "string" ? body.valyuAccessToken.trim() : "";
  const accessToken = fromBody || request.headers.get("x-valyu-token")?.trim() || undefined;
  if (!isSelfHostedMode() && !accessToken) {
    throw new RequestError(401, message, "AUTH_REQUIRED");
  }
  return { body, accessToken };
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
}

const VALYU_ERROR_CODES: Record<number, string> = {
  401: "AUTH_REQUIRED",
  402: "INSUFFICIENT_CREDITS",
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
};

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RequestError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  if (error instanceof ValyuError) {
    const status = valyuErrorStatus(error);
    return json({ error: VALYU_ERROR_CODES[status] || "PROVIDER_ERROR", message: error.message }, status);
  }
  console.error("[api] unexpected error", error);
  return json(
    { error: "SERVER_ERROR", message: "Something interrupted this request. Please try again." },
    500
  );
}
