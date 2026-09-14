import { getDeliverable } from "@/lib/research/service";
import { errorResponse, RequestError, requireValyuToken } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{4,128}$/;
const ALLOWED_HOST_SUFFIXES = [".valyu.ai", ".amazonaws.com"];
const MAX_REDIRECTS = 3;

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function assertAllowedHost(url: URL): void {
  const allowed =
    url.protocol === "https:" &&
    ALLOWED_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
  if (!allowed) {
    throw new RequestError(502, "This file is hosted somewhere unexpected.", "PROVIDER_ERROR");
  }
}

/** Follow redirects manually so every hop is checked against the allowlist. */
async function fetchAllowed(url: string): Promise<Response> {
  let current = new URL(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowedHost(current);
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw new RequestError(502, "The file download redirected too many times.", "PROVIDER_ERROR");
}

/** GET /api/research/[id]/files/[fileId] - stream a deliverable to the browser. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await context.params;
    if (!FILE_ID_PATTERN.test(fileId)) {
      throw new RequestError(400, "This file ID is invalid.", "INVALID_INPUT");
    }
    const accessToken = requireValyuToken(request, "Sign in with Valyu to download this file.");

    const deliverable = await getDeliverable(id, fileId, { accessToken });
    if (!deliverable) throw new RequestError(404, "This file is not available.", "NOT_FOUND");
    const { url, type } = deliverable;

    const upstream = await fetchAllowed(url);
    if (!upstream.ok || !upstream.body) {
      throw new RequestError(502, "Could not download this file.", "PROVIDER_ERROR");
    }

    const extension = CONTENT_TYPES[type] ? type : "";
    const contentType =
      CONTENT_TYPES[type] || upstream.headers.get("content-type") || "application/octet-stream";
    const filename = `polyseer-${id.slice(0, 8)}-${fileId.slice(0, 12)}${extension ? `.${extension}` : ""}`;

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
