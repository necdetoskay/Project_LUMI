export const L8_SEMANTIC_RUBRICS = Object.freeze([
  {
    id: "choice_influence",
    label: "Choice influence",
    criterion:
      "Does the scene meaningfully preserve and develop the child's prior explicit choice instead of merely mentioning it or silently switching branches?",
  },
  {
    id: "personality_emotion",
    label: "NPC personality and emotion consistency",
    criterion:
      "Does Bora remain calm, supportive and cautious while responding empathetically to Arin's anxiety, without mockery or reckless behavior?",
  },
  {
    id: "age_appropriateness",
    label: "Age-band appropriateness",
    criterion:
      "Is the prose genuinely suitable for ages 6-8: understandable, warm, concrete and free from unnecessary adult or technical abstraction?",
  },
]);

export function buildSemanticJudgePrompt(input) {
  const narratives = input?.narratives ?? {};
  const lines = [
    "You are an evaluation judge for Project LUMI children's story quality.",
    "Evaluate only the supplied text against the rubric. Do not rewrite the stories.",
    "Use integer scores from 0 to 5, where 5 is excellent and 0 is a clear failure.",
    "Return strict JSON only, with no markdown or prose outside JSON.",
    'Required shape: {"scores":{"choice_influence":{"score":0,"reason":"..."},"personality_emotion":{"score":0,"reason":"..."},"age_appropriateness":{"score":0,"reason":"..."}}}',
    "",
  ];

  for (const rubric of L8_SEMANTIC_RUBRICS) {
    lines.push(`Rubric ${rubric.id}: ${rubric.criterion}`);
  }

  lines.push(
    "",
    "CHOICE SCENE:",
    String(narratives.choice ?? ""),
    "",
    "PERSONALITY/EMOTION SCENE:",
    String(narratives.personality ?? ""),
    "",
    "AGE-BAND SCENE:",
    String(narratives.age ?? ""),
  );

  return lines.join("\n");
}

export function parseSemanticJudgeResponse(raw) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw ?? "").trim());
  } catch {
    throw new Error("L8 semantic judge must return strict JSON.");
  }

  const scores = parsed?.scores;
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    throw new Error("L8 semantic judge response is missing scores.");
  }

  const normalized = {};
  for (const rubric of L8_SEMANTIC_RUBRICS) {
    const item = scores[rubric.id];
    const score = Number(item?.score);
    const reason = typeof item?.reason === "string" ? item.reason.trim() : "";
    if (!Number.isInteger(score) || score < 0 || score > 5) {
      throw new Error(`Invalid semantic judge score for ${rubric.id}.`);
    }
    if (!reason || reason.length > 500) {
      throw new Error(`Invalid semantic judge reason for ${rubric.id}.`);
    }
    normalized[rubric.id] = { score, reason };
  }

  const values = Object.values(normalized).map((item) => item.score);
  const meanScore =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    scores: normalized,
    meanScore: Math.round(meanScore * 100) / 100,
    normalizedPercent: Math.round((meanScore / 5) * 10000) / 100,
  };
}
