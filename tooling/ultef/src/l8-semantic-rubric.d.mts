export const L8_SEMANTIC_RUBRICS: readonly {
  id: "choice_influence" | "personality_emotion" | "age_appropriateness";
  label: string;
  criterion: string;
}[];

export function buildSemanticJudgePrompt(input: {
  narratives: {
    choice?: string;
    personality?: string;
    age?: string;
  };
}): string;

export function parseSemanticJudgeResponse(raw: string): {
  scores: Record<
    "choice_influence" | "personality_emotion" | "age_appropriateness",
    { score: number; reason: string }
  >;
  meanScore: number;
  normalizedPercent: number;
};
