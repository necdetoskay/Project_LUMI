import type {
  CharacterVisualGenerationPort,
  CharacterVisualGenerationRequest,
  CharacterVisualGenerationResult,
} from "../application/character-visual-generation";
import {
  OPENROUTER_KREA_TURBO_CAPABILITY,
  OpenRouterImageGenerationAdapter,
} from "./openrouter-image-generation";

export type OpenRouterCharacterVisualAdapterOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

export class OpenRouterCharacterVisualGenerationAdapter
  implements CharacterVisualGenerationPort
{
  private readonly genericAdapter: OpenRouterImageGenerationAdapter;

  constructor(options: OpenRouterCharacterVisualAdapterOptions) {
    this.genericAdapter = new OpenRouterImageGenerationAdapter({
      apiKey: options.apiKey,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      capabilities: [OPENROUTER_KREA_TURBO_CAPABILITY],
    });
  }

  async generate(
    request: CharacterVisualGenerationRequest,
  ): Promise<CharacterVisualGenerationResult> {
    const generated = await this.genericAdapter.generate({
      jobId: request.jobId,
      prompt: request.prompt,
      model: request.model,
      candidateCount: request.candidateCount,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
      strategy: "direct",
    });

    return {
      provider: generated.provider,
      model: generated.model,
      candidates: generated.images,
      ...(generated.providerRequestId
        ? { providerRequestId: generated.providerRequestId }
        : {}),
      ...(generated.usageMetadata
        ? { usageMetadata: generated.usageMetadata }
        : {}),
      ...(generated.costMetadata
        ? { costMetadata: generated.costMetadata }
        : {}),
    };
  }
}
