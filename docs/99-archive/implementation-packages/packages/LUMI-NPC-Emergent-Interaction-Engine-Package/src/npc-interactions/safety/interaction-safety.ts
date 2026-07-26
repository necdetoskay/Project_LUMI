import type { NpcInteractionCandidate } from "../types";

const blockedPatterns = [
  /graphic violence/i,
  /sexual/i,
  /self[- ]harm/i,
  /hate/i,
];

export function reviewInteractionSafety(
  candidate: NpcInteractionCandidate,
): {
  allowed: boolean;
  reasons: string[];
} {
  const text = `${candidate.title} ${candidate.summary} ${JSON.stringify(candidate.payload)}`;

  const matches = blockedPatterns.filter((pattern) =>
    pattern.test(text),
  );

  return {
    allowed: matches.length === 0,
    reasons:
      matches.length === 0
        ? []
        : [
            "Interaction matched blocked child-safety pattern",
          ],
  };
}
