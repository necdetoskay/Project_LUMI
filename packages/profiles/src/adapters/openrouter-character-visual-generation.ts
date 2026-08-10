import type {
  CharacterVisualGenerationPort,
  CharacterVisualGenerationRequest,
  CharacterVisualGenerationResult,
} from "../application/character-visual-generation";
import { planImageGeneration } from "../application/image-generation-platform";
import {
  OPENROUTER_KREA_TURBO_CAPABILITY,
  OpenRouterImageGenerationAdapter,
} from "./openrouter-image-generation";

export type OpenRouterCharacterVisualAdapterOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  maxJobCostUsd?: number;
  liveTest?: boolean;
};

export class OpenRouterCharacterVisualGenerationAdapter
  implements CharacterVisualGenerationPort
{
  private readonly genericAdapter: OpenRouterImageGenerationAdapter;
  private readonly maxJobCostUsd: number;
  private readonly liveTest: boolean;

  constructor(options: OpenRouterCharacterVisualAdapterOptions) {
    this.genericAdapter = new OpenRouterImageGenerationAdapter({
      apiKey: options.apiKey,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      capabilities: [OPENROUTER_KREA_TURBO_CAPABILITY],
    });
    this.maxJobCostUsd = options.maxJobCostUsd ?? 0.1;
    this.liveTest = options.liveTest ?? false;
  }

  async generate(
    request: CharacterVisualGenerationRequest,
  ): Promise<CharacterVisualGenerationResult> {
    planImageGeneration(
      OPENROUTER_KREA_TURBO_CAPABILITY,
      {
        candidateCount: request.candidateCount,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        requestMaxCostUsd: this.maxJobCostUsd,
        liveTest: this.liveTest,
        allowGrid: false,
      },
      {
        runtimeMaxJobCostUsd: this.maxJobCostUsd,
        liveTestMaxJobCostUsd: 0.03,
        minimumGridSavingsRatio: 0.2,
        allowUnknownPricing: false,
      },
    );

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
