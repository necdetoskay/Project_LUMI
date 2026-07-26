export type MemorySummaryInput = {
  summaries: string[];
  maxCharacters: number;
};

export function summarizeMemoriesDeterministically(
  input: MemorySummaryInput,
): string {
  const unique = Array.from(
    new Set(
      input.summaries
        .map((summary) => summary.trim())
        .filter(Boolean),
    ),
  );

  let output = "";

  for (const summary of unique) {
    const next = output
      ? `${output} ${summary}`
      : summary;

    if (next.length > input.maxCharacters) {
      break;
    }

    output = next;
  }

  return output;
}
