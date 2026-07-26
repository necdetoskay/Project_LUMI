import type { AiProviderRegistry } from "../providers/provider-registry";
import type {
  AiGenerationInput,
  AiGenerationResult,
} from "../providers/provider.types";
import { AiProviderError } from "../providers/provider-error";
import type { ModelFallbackPlan } from "./model-fallback.types";

export class ModelFallbackService {
  constructor(
    private readonly registry: AiProviderRegistry,
  ) {}

  async execute<T>(
    plan: ModelFallbackPlan,
    input: Omit<AiGenerationInput, "model">,
  ): Promise<{
    result: AiGenerationResult<T>;
    providerCode: string;
    attemptNumber: number;
  }> {
    const candidates = plan.candidates
      .filter((candidate) => candidate.enabled)
      .sort((a, b) => a.priority - b.priority);

    let totalAttempt = 0;
    let lastError: unknown;

    for (const candidate of candidates) {
      const provider =
        this.registry.getTextProvider(
          candidate.providerCode,
        );

      for (
        let attempt = 1;
        attempt <= candidate.maxAttempts;
        attempt += 1
      ) {
        totalAttempt += 1;

        try {
          const result =
            await provider.generateStructured<T>({
              ...input,
              model: candidate.modelCode,
            });

          return {
            result,
            providerCode:
              candidate.providerCode,
            attemptNumber: totalAttempt,
          };
        } catch (error) {
          lastError = error;

          if (
            error instanceof AiProviderError &&
            !error.retryable
          ) {
            break;
          }
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(
          "All model fallback candidates failed",
        );
  }
}
