import type {
  EvaluatedNpcIntent,
  NpcIntentCandidate,
} from "./intent.types";

export function evaluateNpcIntent(
  candidate: NpcIntentCandidate,
): EvaluatedNpcIntent {
  const positive =
    candidate.baseUtility * 0.2 +
    candidate.urgency * 0.15 +
    candidate.emotionalAlignment * 0.15 +
    candidate.goalAlignment * 0.2 +
    candidate.relationshipAlignment * 0.1 +
    candidate.environmentalFit * 0.1 +
    candidate.novelty * 0.1;

  const utility =
    positive -
    candidate.risk * 0.15;

  return {
    ...candidate,
    utility,
  };
}

export function chooseNpcIntent(
  candidates: NpcIntentCandidate[],
  input: {
    minimumUtility: number;
    random: () => number;
  },
): EvaluatedNpcIntent | undefined {
  const evaluated = candidates
    .map(evaluateNpcIntent)
    .filter(
      (candidate) =>
        candidate.utility >=
        input.minimumUtility,
    )
    .sort(
      (a, b) => b.utility - a.utility,
    );

  if (evaluated.length === 0) {
    return undefined;
  }

  const top = evaluated.slice(0, 3);
  const total = top.reduce(
    (sum, item) =>
      sum + Math.max(0.001, item.utility),
    0,
  );
  const roll = input.random() * total;

  let cursor = 0;

  for (const item of top) {
    cursor += Math.max(
      0.001,
      item.utility,
    );

    if (roll <= cursor) {
      return item;
    }
  }

  return top[0];
}
