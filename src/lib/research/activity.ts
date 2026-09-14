/**
 * Turns the DeepResearch message trace into a list of progress steps the UI
 * can render live: the agent's reasoning, each search or read it performs,
 * and the sources each step found.
 */

export interface ActivitySource {
  title: string;
  url: string;
}

export type ActivityType = "thought" | "search" | "read" | "write" | "tool";

export interface ActivityStep {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  status: "running" | "completed" | "failed";
  sources: ActivitySource[];
}

const MAX_MESSAGES = 1000;
const MAX_PARTS = 60;
const MAX_STEPS = 200;
const MAX_SOURCES_PER_STEP = 20;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, limit = 400): string =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

/** Human label for a tool name such as `search_fred` or `research`. */
function toolTitle(name: string): { type: ActivityType; title: string } {
  const lower = name.toLowerCase();
  const source = lower.replace(/^(search|fetch|read|get)_/, "").replace(/_/g, " ");
  if (/fetch|content|read|browse|screenshot/.test(lower)) return { type: "read", title: "Reading sources" };
  if (/write|report|synthesi|finali|deliverable/.test(lower)) return { type: "write", title: "Writing" };
  if (/code|python|calculat|execute/.test(lower)) return { type: "tool", title: "Running calculations" };
  if (lower === "research") return { type: "search", title: "Searching" };
  if (lower.startsWith("search")) {
    return { type: "search", title: `Searching ${source.replace(/\b\w/g, (c) => c.toUpperCase())}` };
  }
  return { type: "tool", title: name };
}

function stepDetail(input: Record<string, unknown>): string {
  const objective = text(input.objective) || text(input.query);
  if (objective) return objective.replace(/^Search:\s*/i, "");
  if (Array.isArray(input.queries)) return input.queries.map((q) => text(q)).filter(Boolean).join("; ");
  const url = text(input.url, 2048);
  if (url) return url;
  if (Array.isArray(input.urls)) return input.urls.map((u) => text(u, 2048)).filter(Boolean).join(", ");
  return "";
}

export function activitySources(value: unknown, limit = MAX_SOURCES_PER_STEP): ActivitySource[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: ActivitySource[] = [];
  for (const raw of value) {
    const source = record(raw);
    const href = text(source.url, 2048);
    try {
      const url = new URL(href);
      if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) continue;
      seen.add(url.href);
      sources.push({ url: url.href, title: text(source.title, 200) || url.hostname });
      if (sources.length >= limit) break;
    } catch {
      // Skip malformed links.
    }
  }
  return sources;
}

export function activityFromMessages(messages: unknown, taskStatus: string): ActivityStep[] {
  if (!Array.isArray(messages)) return [];

  const results = new Map<string, Record<string, unknown>>();
  const ordered: Array<{ role: string; part: Record<string, unknown> }> = [];

  for (const raw of messages.slice(-MAX_MESSAGES)) {
    const message = record(raw);
    const role = String(message.role);
    if (!["assistant", "tool"].includes(role) || !Array.isArray(message.content)) continue;
    for (const rawPart of message.content.slice(0, MAX_PARTS)) {
      const part = record(rawPart);
      const type = String(part.type);
      if (type === "tool-result" && text(part.toolCallId, 200)) {
        results.set(text(part.toolCallId, 200), part);
      } else if (role === "assistant") {
        ordered.push({ role, part });
      }
    }
  }

  const steps: ActivityStep[] = [];
  const seenText = new Set<string>();
  const running = taskStatus === "running" || taskStatus === "queued";
  let index = 0;

  for (const { part } of ordered) {
    const type = String(part.type);
    if (type === "text" || type === "reasoning") {
      const body = text(part.text, 1200);
      if (!body) continue;
      const key = `${type}:${body}`;
      if (seenText.has(key)) continue;
      seenText.add(key);
      steps.push({
        id: `${type}-${index++}`,
        type: type === "reasoning" ? "thought" : "write",
        title: type === "reasoning" ? "Thinking" : "Notes",
        detail: body,
        status: "completed",
        sources: [],
      });
    } else if (type === "tool-call") {
      const id = text(part.toolCallId, 200);
      const name = text(part.toolName, 100);
      if (!id || !name) continue;
      const result = results.get(id);
      const envelope = record(result?.output);
      const output = envelope.value === undefined ? envelope : record(envelope.value);
      const failed =
        envelope.type === "error-text" ||
        envelope.type === "error-json" ||
        output.success === false ||
        result?.isError === true;
      const { type: stepType, title } = toolTitle(name);
      steps.push({
        id,
        type: stepType,
        title,
        detail: stepDetail(record(part.input)) || undefined,
        status: failed ? "failed" : result ? "completed" : running ? "running" : "completed",
        sources: activitySources(output.sources),
      });
    }
  }

  return steps.slice(-MAX_STEPS);
}
