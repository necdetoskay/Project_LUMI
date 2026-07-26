export type AiCapability =
  | "text"
  | "image"
  | "audio"
  | "embedding";

export type AiGenerationInput = {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
};

export type AiGenerationResult<T> = {
  providerRequestId?: string;
  model: string;
  output: T;
  usage: AiUsage;
  latencyMs: number;
  rawMetadata?: Record<string, unknown>;
};

export interface AiTextProvider {
  readonly providerCode: string;

  generateStructured<T>(
    input: AiGenerationInput,
  ): Promise<AiGenerationResult<T>>;
}
