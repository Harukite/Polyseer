import { getResearchTask } from "@/lib/research/service";
import { errorResponse, json, readResearchRequest } from "@/lib/server/http";
import { isTransientValyuError } from "@/lib/valyu/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET or POST /api/research/[id] - current status, progress, and result of one
 * forecast. POST carries the Valyu token in the body.
 */
async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { accessToken } = await readResearchRequest(request, "Sign in with Valyu to view this research.");
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

export const GET = handle;
export const POST = handle;
