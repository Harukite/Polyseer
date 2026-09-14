import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { parseResearchEffort } from "@/lib/research/effort";
import { buildResearchNotification } from "@/lib/research/notification";
import { createForecastTask, listResearchTasks } from "@/lib/research/service";
import {
  appOrigin,
  assertSameOrigin,
  errorResponse,
  json,
  readJson,
  RequestError,
  requireValyuToken,
} from "@/lib/server/http";
import { fetchValyuUserEmail } from "@/lib/valyu/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/research - the caller's forecast history. */
export async function GET(request: Request) {
  try {
    const accessToken = requireValyuToken(request, "Sign in with Valyu to see your research.");
    const tasks = await listResearchTasks({ accessToken });
    return json({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/research - start a forecast for a market URL. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const accessToken = requireValyuToken(request, "Sign in with Valyu to run research.");

    const body = (await readJson(request)) as Record<string, unknown>;
    const marketUrl = typeof body?.marketUrl === "string" ? body.marketUrl.trim() : "";
    const effort = parseResearchEffort(body?.effort);
    if (!marketUrl || marketUrl.length > 2048) {
      throw new RequestError(400, "Paste a Polymarket or Kalshi market URL.", "INVALID_INPUT");
    }
    if (!effort) {
      throw new RequestError(400, "Choose a valid research effort.", "INVALID_INPUT");
    }

    const email = isSelfHostedMode()
      ? process.env.DEEPRESEARCH_ALERT_EMAIL
      : accessToken
        ? await fetchValyuUserEmail(accessToken)
        : undefined;
    const notification = buildResearchNotification(email, appOrigin(request));

    const created = await createForecastTask({ marketUrl, effort, notification }, { accessToken });
    return json({ research: created }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
