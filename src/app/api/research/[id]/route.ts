import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { getResearchTask } from "@/lib/research/service";
import { errorResponse, json, valyuTokenFromRequest } from "@/lib/server/http";
import { isTransientValyuError } from "@/lib/valyu/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/research/[id] - current status, progress, and result of one forecast. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const accessToken = valyuTokenFromRequest(request);
    if (!isSelfHostedMode() && !accessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to view this research." }, 401);
    }
    try {
      const task = await getResearchTask(id, { accessToken });
      return json({ task });
    } catch (error) {
      // The status endpoint returns occasional 5xx mid-run. Tell the client to keep polling.
      if (isTransientValyuError(error)) {
        return json({ transient: true, message: "Valyu is busy. Retrying shortly." }, 503, {
          "Retry-After": "5",
        });
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
