/**
 * Structured forecast output.
 *
 * The JSON Schema is sent as the DeepResearch output format so the agent
 * returns a calibrated probability, the evidence that moved it, and a clear
 * side to take. The TypeScript type mirrors the schema for the UI.
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

const probability = { type: "number", minimum: 0, maximum: 1 };
const nullableString = { type: ["string", "null"] };

export const forecastOutputSchema = {
  type: "object",
  additionalProperties: false,
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
    resolution_date: {
      ...nullableString,
      description: "ISO date the market resolves or closes, if known.",
    },
    market_probability: {
      type: ["number", "null"],
      minimum: 0,
      maximum: 1,
      description: "The market's implied P(YES) at the time of research.",
    },
    probability: {
      ...probability,
      description: "Your calibrated P(YES), between 0 and 1.",
    },
    probability_range: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["low", "high"],
      properties: { low: probability, high: probability },
      description: "A plausible range for P(YES) given the uncertainty.",
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "How well the evidence supports the number, not how extreme it is.",
    },
    recommendation: {
      type: "object",
      additionalProperties: false,
      required: ["side", "reasoning"],
      properties: {
        side: {
          type: "string",
          enum: ["YES", "NO", "NO_BET"],
          description:
            "The side with positive expected value versus the market price, or NO_BET if the edge is too small.",
        },
        edge: {
          type: ["number", "null"],
          minimum: -1,
          maximum: 1,
          description: "Your probability minus the market probability, as a fraction.",
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
      type: ["object", "null"],
      additionalProperties: false,
      required: ["value", "reference_class"],
      properties: {
        value: probability,
        reference_class: { type: "string" },
        note: nullableString,
      },
      description: "Outside view: the reference class and its historical rate.",
    },
    key_evidence: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "direction", "weight"],
        properties: {
          claim: { type: "string" },
          direction: { type: "string", enum: ["for", "against"] },
          weight: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            description: "How much this moved the estimate, 1 (minor) to 5 (decisive).",
          },
          source_title: nullableString,
          source_url: nullableString,
          date: nullableString,
        },
      },
      description: "What moved the estimate, each way, strongest first.",
    },
    catalysts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["event", "expected_impact"],
        properties: {
          event: { type: "string" },
          date: nullableString,
          expected_impact: { type: "string" },
        },
      },
      description: "Upcoming events before resolution that could move the probability.",
    },
    outcomes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["outcome", "probability"],
        properties: {
          outcome: { type: "string" },
          market_probability: { type: ["number", "null"], minimum: 0, maximum: 1 },
          probability: probability,
        },
      },
      description:
        "For multi-outcome events only: your probability for each leading outcome.",
    },
    what_would_change_mind: {
      type: "array",
      items: { type: "string" },
      description: "Specific observations that would materially change the forecast.",
    },
    risks: {
      type: "array",
      items: { type: "string" },
      description: "Ways this forecast could be wrong, including resolution ambiguity.",
    },
    rationale: {
      type: "string",
      description:
        "The inside view in markdown: how the evidence combines into the probability, with sources named.",
    },
  },
} as const;

export function isForecastOutput(value: unknown): value is ForecastOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const output = value as Record<string, unknown>;
  return (
    typeof output.question === "string" &&
    typeof output.probability === "number" &&
    typeof output.summary === "string" &&
    !!output.recommendation &&
    typeof output.recommendation === "object" &&
    Array.isArray(output.key_evidence)
  );
}
