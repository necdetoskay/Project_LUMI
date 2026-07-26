export type MediaModerationResult = {
  allowed: boolean;
  reasons: string[];
  sanitizedPrompt?: string;
};

const blockedPatterns = [
  /graphic violence/i,
  /sexual/i,
  /self[- ]harm/i,
  /hate symbol/i,
];

export function reviewMediaRequest(input: {
  prompt: string;
  purpose: string;
  childAgeBand?: string;
}): MediaModerationResult {
  const matches = blockedPatterns.filter(
    (pattern) => pattern.test(input.prompt),
  );

  if (matches.length > 0) {
    return {
      allowed: false,
      reasons: [
        "Media prompt violates child-safety rules",
      ],
    };
  }

  return {
    allowed: true,
    reasons: [],
    sanitizedPrompt: input.prompt.trim(),
  };
}
