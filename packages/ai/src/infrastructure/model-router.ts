import type { ModelPolicy } from "../domain/generation-types";
import type { GenerationProvider } from "../ports/provider.port";
import type { ModelChoice, ModelRouterPort } from "../ports/model-router.port";

export interface RouterConfig {
  temperature?: number;
  maxTokens?: number;
}

export class ModelRouter implements ModelRouterPort {
  private readonly providers = new Map<string, GenerationProvider>();
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: RouterConfig = {}) {
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1024;
  }

  public registerProvider(provider: GenerationProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  public provider(providerId: string): GenerationProvider | undefined {
    return this.providers.get(providerId);
  }

  public async choose(
    policy: ModelPolicy,
    _task: string,
    fallbacksAllowed = true,
  ): Promise<ModelChoice> {
    const candidates = fallbacksAllowed
      ? [policy.preferredModel, ...policy.fallbackModels]
      : [policy.preferredModel];
    for (const modelId of candidates) {
      const provider = this.resolveProviderForModel(modelId);
      if (provider) {
        return {
          providerId: provider.providerId,
          modelId,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
        };
      }
    }
    throw new Error(
      `No provider available for model policy (${candidates.join(", ")}).`,
    );
  }

  private resolveProviderForModel(
    modelId: string,
  ): GenerationProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.supportsModel?.(modelId)) {
        return provider;
      }
    }
    return undefined;
  }
}
