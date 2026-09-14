/**
 * Research effort levels.
 *
 * Each level maps to a DeepResearch `mode`. Labels follow the low / medium /
 * high / xhigh convention people know from reasoning-effort settings.
 */

export const researchEfforts = [
  {
    value: "fast",
    label: "Low",
    estimate: "About 5 min",
    credits: "$0.10",
    description: "A quick read of the market and the latest news.",
  },
  {
    value: "standard",
    label: "Medium",
    estimate: "10 to 20 min",
    credits: "$0.50",
    description: "Broader sourcing with cross-checked evidence.",
  },
  {
    value: "heavy",
    label: "High",
    estimate: "30 to 60 min",
    credits: "$2.50",
    description: "Deep dive: base rates, catalysts, and counter-evidence.",
  },
  {
    value: "max",
    label: "XHigh",
    estimate: "Up to 2 hours",
    credits: "$15.00",
    description: "Exhaustive research at maximum depth.",
  },
] as const;

export type ResearchEffort = (typeof researchEfforts)[number]["value"];

export const DEFAULT_EFFORT: ResearchEffort = "standard";

export function parseResearchEffort(value: unknown): ResearchEffort | undefined {
  if (value === undefined || value === null) return DEFAULT_EFFORT;
  return researchEfforts.find((effort) => effort.value === value)?.value;
}

export function effortDetails(value: string | null | undefined) {
  return researchEfforts.find((effort) => effort.value === value);
}
