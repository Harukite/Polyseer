import { listResearchTasks } from "@/lib/research/service";
import { errorResponse, json, readResearchRequest } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/research/list - the caller's forecast history, with the Valyu token in the body. */
export async function POST(request: Request) {
  try {
    const { accessToken } = await readResearchRequest(request, "Sign in with Valyu to see your research.");
    const tasks = await listResearchTasks({ accessToken });
    return json({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}
