import type {
  CharacterVisualGenerationPort,
  CharacterVisualGenerationRequest,
  CharacterVisualGenerationResult,
  GeneratedImageCandidate,
} from "../application/character-visual-generation";

export type OpenRouterCharacterVisualAdapterOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

type OpenRouterImageResponse = {
  id?: string;
  data?: Array<{
    b64_json?: string;
    mime_type?: string;
    width?: number;
    height?: number;
  }>;
  usage?: Record<string, unknown>;
};

export class OpenRouterCharacterVisualGenerationAdapter
  implements CharacterVisualGenerationPort
{
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(private readonly options: OpenRouterCharacterVisualAdapterOptions) {
    if (!options.apiKey) {
      throw new Error("OPENROUTER_API_KEY is required for live image generation");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? "https://openrouter.ai/api/v1/images";
  }

  async generate(
    request: CharacterVisualGenerationRequest,
  ): Promise<CharacterVisualGenerationResult> {
    const candidates: GeneratedImageCandidate[] = [];
    let providerRequestId: string | undefined;
    const usage: Record<string, unknown> = {};

    // Krea's image endpoint currently returns one image per request, so logical
    // multi-candidate jobs fan out here while remaining one application job.
    for (let index = 0; index < request.candidateCount; index += 1) {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/necdetoskay/Project_LUMI",
          "X-Title": "Project LUMI",
        },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          resolution: request.resolution,
          aspect_ratio: request.aspectRatio,
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new Error(`OPENROUTER_IMAGE_${response.status}: ${raw.slice(0, 500)}`);
      }

      const payload = JSON.parse(raw) as OpenRouterImageResponse;
      providerRequestId ??= payload.id;
      if (payload.usage) Object.assign(usage, payload.usage);
      const image = payload.data?.[0];
      if (!image?.b64_json) {
        throw new Error("OPENROUTER_IMAGE_EMPTY: response did not contain b64_json");
      }

      candidates.push({
        index,
        bytesBase64: image.b64_json,
        mimeType: image.mime_type ?? "image/png",
        ...(typeof image.width === "number" ? { width: image.width } : {}),
        ...(typeof image.height === "number" ? { height: image.height } : {}),
      });
    }

    return {
      provider: "openrouter",
      model: request.model,
      candidates,
      ...(providerRequestId ? { providerRequestId } : {}),
      ...(Object.keys(usage).length > 0 ? { usageMetadata: usage } : {}),
      ...(request.model === "krea/krea-2-medium-turbo"
        ? {
            costMetadata: {
              currency: "USD",
              estimatedUnitCost: 0.015,
              estimatedTotalCost: Number((0.015 * request.candidateCount).toFixed(4)),
              pricingBasis: "openrouter-model-list-2026-08-10",
            },
          }
        : {}),
    };
  }
}
