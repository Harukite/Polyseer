/**
 * Structured forecast output.
 *
 * The JSON Schema is sent as the DeepResearch output format so the agent
 * returns a calibrated probability, the evidence that moved it, and a clear
 * side to take. The TypeScript type mirrors the schema for the UI.
 *
 * The API accepts a restricted schema dialect: `type`, `description`,
 * `nullable`, `properties`, `required`, `items`, and `enum`. Ranges are
 * therefore stated in descriptions and clamped when the output is read.
 */

export type EvidenceDirection = "for" | "against";
export type ForecastConfidence = "low" | "medium" | "high";
export type ForecastSide = "YES" | "NO" | "NO_BET";

export interface ForecastEvidence {
  claim: string;
  direction: EvidenceDirection;
  weight: number;
  source_title?: string | null;
  source_url?: string | null;
  date?: string | null;
}

export interface ForecastCatalyst {
  event: string;
  date?: string | null;
  expected_impact: string;
}

export interface ForecastOutcome {
  outcome: string;
  market_probability?: number | null;
  probability: number;
}

export interface ForecastOutput {
  question: string;
  resolution_criteria: string;
  resolution_date?: string | null;
  market_probability?: number | null;
  probability: number;
  probability_range?: { low: number; high: number } | null;
  confidence: ForecastConfidence;
  recommendation: {
    side: ForecastSide;
    edge?: number | null;
    reasoning: string;
  };
  summary: string;
  base_rate?: {
    value: number;
    reference_class: string;
    note?: string | null;
  } | null;
  key_evidence: ForecastEvidence[];
  catalysts?: ForecastCatalyst[];
  outcomes?: ForecastOutcome[];
  what_would_change_mind?: string[];
  risks?: string[];
  rationale: string;
}

const probability = (description: string) => ({
  type: "number",
  description: `${description} A fraction between 0 and 1.`,
});

const nullableString = (description: string) => ({ type: "string", nullable: true, description });

export const forecastOutputSchema = {
  type: "object",
  required: [
    "question",
    "resolution_criteria",
    "probability",
    "confidence",
    "recommendation",
    "summary",
    "key_evidence",
    "rationale",
  ],
  properties: {
    question: {
      type: "string",
      description: "The forecast question exactly as the market states it.",
    },
    resolution_criteria: {
      type: "string",
      description: "What makes this market resolve YES, stated precisely.",
    },
    resolution_date: nullableString("ISO date (YYYY-MM-DD) the market resolves or closes, if known."),
    market_probability: {
      type: "number",
      nullable: true,
      description: "The market's implied probability of YES at the time of research. A fraction between 0 and 1.",
    },
    probability: probability("Your calibrated probability that the market resolves YES."),
    probability_range: {
      type: "object",
      nullable: true,
      required: ["low", "high"],
      properties: {
        low: probability("Lower bound of the plausible range."),
        high: probability("Upper bound of the plausible range."),
      },
      description: "A plausible range for the probability given the uncertainty.",
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "How well the evidence supports the number, not how extreme it is.",
    },
    recommendation: {
      type: "object",
      required: ["side", "reasoning"],
      properties: {
        side: {
          type: "string",
          enum: ["YES", "NO", "NO_BET"],
          description:
            "The side with positive expected value versus the market price, or NO_BET when the edge sits inside your own uncertainty.",
        },
        edge: {
          type: "number",
          nullable: true,
          description: "Your probability minus the market probability, as a fraction between -1 and 1.",
        },
        reasoning: {
          type: "string",
          description: "One or two sentences on why this side, or why to stay out.",
        },
      },
    },
    summary: {
      type: "string",
      description: "A two to three sentence verdict a trader can read in ten seconds.",
    },
    base_rate: {
      type: "object",
      nullable: true,
      required: ["value", "reference_class"],
      properties: {
        value: probability("Historical frequency of the outcome in the reference class."),
        reference_class: { type: "string", description: "The class of comparable events." },
        note: nullableString("How well the reference class fits this market."),
      },
      description: "Outside view: the reference class and its historical rate.",
    },
    key_evidence: {
      type: "array",
      description: "What moved the estimate, each way, strongest first. At least three items.",
      items: {
        type: "object",
        required: ["claim", "direction", "weight"],
        properties: {
          claim: { type: "string", description: "A specific, checkable claim." },
          direction: {
            type: "string",
            enum: ["for", "against"],
            description: "Whether the claim supports YES (for) or NO (against).",
          },
          weight: {
            type: "integer",
            description: "How much this moved the estimate: 1 (minor) to 5 (decisive).",
          },
          source_title: nullableString("Title of the source behind the claim."),
          source_url: nullableString("URL of the source behind the claim."),
          date: nullableString("Date of the source or event, YYYY-MM-DD."),
        },
      },
    },
    catalysts: {
      type: "array",
      description: "Upcoming events before resolution that could move the probability.",
      items: {
        type: "object",
        required: ["event", "expected_impact"],
        properties: {
          event: { type: "string" },
          date: nullableString("When it happens, YYYY-MM-DD if known."),
          expected_impact: { type: "string", description: "Which way it would push the probability, and why." },
        },
      },
    },
    outcomes: {
      type: "array",
      description: "For multi-outcome events only: your probability for each leading outcome. Empty for binary markets.",
      items: {
        type: "object",
        required: ["outcome", "probability"],
        properties: {
          outcome: { type: "string" },
          market_probability: {
            type: "number",
            nullable: true,
            description: "The market's implied probability for this outcome. A fraction between 0 and 1.",
          },
          probability: probability("Your probability for this outcome."),
        },
      },
    },
    what_would_change_mind: {
      type: "array",
      description: "Specific observations that would materially change the forecast.",
      items: { type: "string" },
    },
    risks: {
      type: "array",
      description: "Ways this forecast could be wrong, including resolution ambiguity.",
      items: { type: "string" },
    },
    rationale: {
      type: "string",
      description:
        "The inside view in markdown: how the evidence combines into the probability, naming sources.",
    },
  },
} as const;

const clamp = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;

const nullable = <T>(value: T | null | undefined): T | null => (value === undefined ? null : value);

/** Validate and clamp raw output into a ForecastOutput, or return undefined. */
export function parseForecastOutput(value: unknown): ForecastOutput | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, any>;
  const probability = clamp(raw.probability, 0, 1);
  const recommendation = raw.recommendation;
  if (
    typeof raw.question !== "string" ||
    probability === undefined ||
    typeof raw.summary !== "string" ||
    !recommendation ||
    typeof recommendation !== "object" ||
    !Array.isArray(raw.key_evidence)
  ) {
    return undefined;
  }

  const side: ForecastSide = ["YES", "NO", "NO_BET"].includes(recommendation.side) ? recommendation.side : "NO_BET";
  const confidence: ForecastConfidence = ["low", "medium", "high"].includes(raw.confidence) ? raw.confidence : "medium";
  const range =
    raw.probability_range && typeof raw.probability_range === "object"
      ? { low: clamp(raw.probability_range.low, 0, 1), high: clamp(raw.probability_range.high, 0, 1) }
      : null;
  const baseRate =
    raw.base_rate && typeof raw.base_rate === "object" && clamp(raw.base_rate.value, 0, 1) !== undefined
      ? {
          value: clamp(raw.base_rate.value, 0, 1) as number,
          reference_class: String(raw.base_rate.reference_class || ""),
          note: nullable(raw.base_rate.note),
        }
      : null;

  return {
    question: raw.question,
    resolution_criteria: typeof raw.resolution_criteria === "string" ? raw.resolution_criteria : "",
    resolution_date: nullable(raw.resolution_date),
    market_probability: clamp(raw.market_probability, 0, 1) ?? null,
    probability,
    probability_range: range && range.low !== undefined && range.high !== undefined ? { low: range.low, high: range.high } : null,
    confidence,
    recommendation: {
      side,
      edge: clamp(recommendation.edge, -1, 1) ?? null,
      reasoning: typeof recommendation.reasoning === "string" ? recommendation.reasoning : "",
    },
    summary: raw.summary,
    base_rate: baseRate,
    key_evidence: raw.key_evidence
      .filter((item: any) => item && typeof item.claim === "string")
      .map((item: any) => ({
        claim: item.claim,
        direction: item.direction === "against" ? "against" : "for",
        weight: Math.round(clamp(item.weight, 1, 5) ?? 3),
        source_title: nullable(item.source_title),
        source_url: nullable(item.source_url),
        date: nullable(item.date),
      })),
    catalysts: Array.isArray(raw.catalysts)
      ? raw.catalysts
          .filter((item: any) => item && typeof item.event === "string")
          .map((item: any) => ({
            event: item.event,
            date: nullable(item.date),
            expected_impact: typeof item.expected_impact === "string" ? item.expected_impact : "",
          }))
      : [],
    outcomes: Array.isArray(raw.outcomes)
      ? raw.outcomes
          .filter((item: any) => item && typeof item.outcome === "string" && clamp(item.probability, 0, 1) !== undefined)
          .map((item: any) => ({
            outcome: item.outcome,
            market_probability: clamp(item.market_probability, 0, 1) ?? null,
            probability: clamp(item.probability, 0, 1) as number,
          }))
      : [],
    what_would_change_mind: Array.isArray(raw.what_would_change_mind)
      ? raw.what_would_change_mind.filter((item: unknown) => typeof item === "string")
      : [],
    risks: Array.isArray(raw.risks) ? raw.risks.filter((item: unknown) => typeof item === "string") : [],
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
  };
}
