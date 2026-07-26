import type { RetrievedMemory } from "../types";

export function budgetMemories(
  memories: RetrievedMemory[],
  tokenBudget: number,
): RetrievedMemory[] {
  const sorted = [...memories].sort(
    (a, b) => b.finalScore - a.finalScore,
  );

  const selected: RetrievedMemory[] = [];
  let consumed = 0;

  for (const memory of sorted) {
    if (
      consumed + memory.estimatedTokens >
      tokenBudget
    ) {
      continue;
    }

    selected.push(memory);
    consumed += memory.estimatedTokens;
  }

  return selected;
}
