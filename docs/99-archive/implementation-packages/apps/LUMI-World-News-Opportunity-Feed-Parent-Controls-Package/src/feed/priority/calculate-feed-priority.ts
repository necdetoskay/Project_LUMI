import type { FeedPriority } from "../types";

export function calculateFeedPriority(input: {
  urgency: number;
  expiryHours?: number;
  relationshipScore?: number;
  noveltyScore?: number;
  parentPinned?: boolean;
}): FeedPriority {
  if (input.parentPinned) return "urgent";

  const expiryPressure =
    input.expiryHours !== undefined
      ? input.expiryHours <= 12
        ? 1
        : input.expiryHours <= 48
          ? 0.6
          : 0.2
      : 0;

  const score =
    input.urgency * 0.45 +
    expiryPressure * 0.25 +
    (input.relationshipScore ?? 0.5) * 0.15 +
    (input.noveltyScore ?? 0.5) * 0.15;

  if (score >= 0.8) return "urgent";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "normal";
  return "low";
}
