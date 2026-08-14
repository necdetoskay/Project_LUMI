export type TextGenerationRequest = {
  purpose: string;
  system: string;
  user: string;
  provider?: string | null;
  model?: string | null;
  generationConfig?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
};

export type TextGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type TextGenerationResult = {
  output: string;
  parsedJson: unknown | null;
  provider: string;
  model: string;
  usage: TextGenerationUsage;
  latencyMs: number;
  estimatedCostUsd: number | null;
};

export interface TextGenerationProvider {
  readonly id: string;
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}
