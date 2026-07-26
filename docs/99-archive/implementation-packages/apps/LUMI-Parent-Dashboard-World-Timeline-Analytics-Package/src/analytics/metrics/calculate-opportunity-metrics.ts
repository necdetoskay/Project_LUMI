import type { OpportunityMetrics } from "../types";

export function calculateOpportunityMetrics(input: {
  received: number;
  viewed: number;
  accepted: number;
  declined: number;
  snoozed: number;
  expired: number;
  storyStarted: number;
}): OpportunityMetrics {
  const acceptanceRate =
    input.received > 0
      ? input.accepted / input.received
      : 0;

  const storyConversionRate =
    input.accepted > 0
      ? input.storyStarted / input.accepted
      : 0;

  return {
    ...input,
    acceptanceRate,
    storyConversionRate,
  };
}
