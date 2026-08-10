import type {
  GeneratedImage,
  ImageGenerationModelCapabilities,
  ImageGenerationProviderPort,
  ImageGenerationProviderRequest,
  ImageGenerationProviderResult,
} from "../application/image-generation-platform";

export const OPENROUTER_KREA_TURBO_CAPABILITY: ImageGenerationModelCapabilities =
  {
    provider: "openrouter",
    model: "krea/krea-2-medium-turbo",
    supportedAspectRatios: ["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"],
    supportedResolutions: ["1K"],
    maxImagesPerRequest: 1,
    supportsNativeBatch: false,
    supportsGrid: true,
    maxGridCells: 4,
    pricing: {
      currency: "USD",
      perProviderRequestUsd: 0.015,
      pricingBasis: "openrouter-model-list-2026-08-10",
    },
  };

export type OpenRouterImageGenerationAdapterOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  capabilities?: readonly ImageGenerationModelCapabilities[];
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

function gridPrompt(request: ImageGenerationProviderRequest): string {
  if (request.strategy !== "grid" || !request.grid) return request.prompt;
  return [
    request.prompt,
    `Render exactly ${request.grid.rows} rows by ${request.grid.columns} columns as one clean image grid.`,
    `Each cell must contain one independent candidate, centered inside its own cell with no element crossing cell boundaries.`,
    `Use equal cell sizes, no gutters, no labels, no text, no borders, and no overlap between cells.`,
  ].join(" ");
}

export class OpenRouterImageGenerationAdapter
  implements ImageGenerationProviderPort
{
  readonly capabilities: readonly ImageGenerationModelCapabilities[];
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(
    private readonly options: OpenRouterImageGenerationAdapterOptions,
  ) {
    if (!options.apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is required for live image generation",
      );
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? "https://openrouter.ai/api/v1/images";
    this.capabilities = options.capabilities ?? [
      OPENROUTER_KREA_TURBO_CAPABILITY,
    ];
  }

  private capabilityFor(model: string) {
    const capability = this.capabilities.find((entry) => entry.model === model);
    if (!capability) throw new Error("OPENROUTER_IMAGE_MODEL_UNSUPPORTED");
    return capability;
  }

  private async executeOne(
    request: ImageGenerationProviderRequest,
    prompt: string,
  ): Promise<{
    id?: string;
    image: GeneratedImage;
    usage?: Record<string, unknown>;
  }> {
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
        prompt,
        resolution: request.resolution,
        aspect_ratio: request.aspectRatio,
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(
        `OPENROUTER_IMAGE_${response.status}: ${raw.slice(0, 500)}`,
      );
    }

    const payload = JSON.parse(raw) as OpenRouterImageResponse;
    const image = payload.data?.[0];
    if (!image?.b64_json) {
      throw new Error(
        "OPENROUTER_IMAGE_EMPTY: response did not contain b64_json",
      );
    }

    return {
      ...(payload.id ? { id: payload.id } : {}),
      image: {
        index: 0,
        bytesBase64: image.b64_json,
        mimeType: image.mime_type ?? "image/png",
        ...(typeof image.width === "number" ? { width: image.width } : {}),
        ...(typeof image.height === "number" ? { height: image.height } : {}),
      },
      ...(payload.usage ? { usage: payload.usage } : {}),
    };
  }

  async generate(
    request: ImageGenerationProviderRequest,
  ): Promise<ImageGenerationProviderResult> {
    const capability = this.capabilityFor(request.model);
    if (
      request.strategy === "native_batch" &&
      !capability.supportsNativeBatch
    ) {
      throw new Error("OPENROUTER_NATIVE_BATCH_UNSUPPORTED");
    }
    if (request.strategy === "grid" && !capability.supportsGrid) {
      throw new Error("OPENROUTER_GRID_UNSUPPORTED");
    }

    const providerRequestCount =
      request.strategy === "grid" ? 1 : request.candidateCount;
    const images: GeneratedImage[] = [];
    let providerRequestId: string | undefined;
    const usageMetadata: Record<string, unknown> = {};

    for (let index = 0; index < providerRequestCount; index += 1) {
      const result = await this.executeOne(request, gridPrompt(request));
      providerRequestId ??= result.id;
      if (result.usage) Object.assign(usageMetadata, result.usage);
      images.push({ ...result.image, index });
    }

    const estimatedCostUsd = capability.pricing?.perProviderRequestUsd
      ? Number(
          (
            capability.pricing.perProviderRequestUsd * providerRequestCount
          ).toFixed(6),
        )
      : undefined;

    return {
      provider: capability.provider,
      model: capability.model,
      images,
      ...(providerRequestId ? { providerRequestId } : {}),
      ...(Object.keys(usageMetadata).length > 0 ? { usageMetadata } : {}),
      ...(typeof estimatedCostUsd === "number"
        ? {
            actualCostUsd: estimatedCostUsd,
            costMetadata: {
              currency: "USD",
              estimatedTotalCost: estimatedCostUsd,
              pricingBasis: capability.pricing?.pricingBasis,
            },
          }
        : {}),
    };
  }
}
