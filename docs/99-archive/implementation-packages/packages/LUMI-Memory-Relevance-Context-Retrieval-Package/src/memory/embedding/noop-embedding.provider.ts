import type {
  EmbeddingInput,
  EmbeddingProvider,
  EmbeddingResult,
} from "./embedding-provider.types";

export class NoopEmbeddingProvider
  implements EmbeddingProvider
{
  readonly providerCode = "noop";

  async embed(
    input: EmbeddingInput,
  ): Promise<EmbeddingResult> {
    return {
      model: input.model,
      dimensions: 0,
      vectors: input.texts.map(() => []),
    };
  }
}
