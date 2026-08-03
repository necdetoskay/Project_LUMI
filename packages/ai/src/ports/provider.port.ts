import type { ProviderUsage } from "../domain/generation-types";

export interface ProviderCompletionRequest {
  requestId: string;
  task: string;
  model: string;
  systemPrompt: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  seed?: number;
  jsonMode?: boolean;
}

export interface ProviderCompletion {
  content: string;
  providerId: string;
  model: string;
  usage: ProviderUsage;
}

export interface GenerationProvider {
  readonly providerId: string;
  complete(request: ProviderCompletionRequest): Promise<ProviderCompletion>;
  supportsModel?(modelId: string): boolean;
}
