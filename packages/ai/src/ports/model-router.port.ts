import type { ModelPolicy } from "../domain/generation-types";
import type { GenerationProvider } from "./provider.port";

export interface ModelChoice {
  providerId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
}

export interface ModelRouterPort {
  choose(
    policy: ModelPolicy,
    task: string,
    fallbacksAllowed?: boolean,
  ): Promise<ModelChoice>;
  registerProvider(provider: GenerationProvider): void;
  provider(providerId: string): GenerationProvider | undefined;
}
