import type { GeneratedAsset } from "../types";

export type ImageGenerationInput = {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
  referenceAssetUrls?: string[];
  consistencyMetadata?: Record<string, unknown>;
};

export interface ImageGenerationProvider {
  readonly providerCode: string;

  generateImage(
    input: ImageGenerationInput,
  ): Promise<GeneratedAsset>;
}
