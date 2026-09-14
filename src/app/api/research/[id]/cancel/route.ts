import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { cancelResearchTask, getResearchTask } from "@/lib/research/service";
import { assertSameOrigin, errorResponse, json, valyuTokenFromRequest } from "@/lib/server/http";
import { ValyuError } from "@/lib/valyu/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/research/[id]/cancel - stop a running forecast and return its latest state. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const accessToken = valyuTokenFromRequest(request);
    if (!isSelfHostedMode() && !accessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to cancel research." }, 401);
    }
    try {
      await cancelResearchTask(id, { accessToken });
    } catch (error) {
      // Already finished or already cancelled: fall through and report the current state.
      if (!(error instanceof ValyuError)) throw error;
    }
    const task = await getResearchTask(id, { accessToken });
    return json({ task });
  } catch (error) {
    return errorResponse(error);
  }
}
