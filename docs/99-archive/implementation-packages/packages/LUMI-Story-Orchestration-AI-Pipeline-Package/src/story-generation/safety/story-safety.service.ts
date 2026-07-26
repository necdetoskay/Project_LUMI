import type { GeneratedStory } from "../schemas/generated-story.schema";

export type StorySafetyDecision =
  | "allow"
  | "allow_with_changes"
  | "block"
  | "manual_review";

export type StorySafetyResult = {
  decision: StorySafetyDecision;
  reasons: string[];
  revisedStory?: GeneratedStory;
};

const blockedPatterns = [
  /graphic violence/i,
  /sexual content/i,
  /self[- ]harm/i,
  /hate speech/i,
];

export async function reviewStorySafety(
  story: GeneratedStory,
): Promise<StorySafetyResult> {
  const serialized = JSON.stringify(story);

  const matched = blockedPatterns.filter((pattern) =>
    pattern.test(serialized),
  );

  if (matched.length > 0) {
    return {
      decision: "block",
      reasons: [
        "Generated story matched blocked safety patterns",
      ],
    };
  }

  return {
    decision: "allow",
    reasons: [],
  };
}
