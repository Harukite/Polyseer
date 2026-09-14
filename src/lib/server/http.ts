import { NextResponse } from "next/server";

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

/** The signed-in user's Valyu access token, sent by the client on every research call. */
export function valyuTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("x-valyu-token")?.trim();
  return header || undefined;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RequestError) {
    return json({ error: error.code, message: error.message }, error.status);
  }
  console.error("[api] unexpected error", error);
  return json(
    { error: "SERVER_ERROR", message: "Something interrupted this request. Please try again." },
    500
  );
}
