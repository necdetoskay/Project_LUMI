export type EmbeddingInput = {
  model: string;
  texts: string[];
};

export type EmbeddingResult = {
  model: string;
  dimensions: number;
  vectors: number[][];
  usage?: {
    inputTokens?: number;
  };
};

export interface EmbeddingProvider {
  readonly providerCode: string;

  embed(
    input: EmbeddingInput,
  ): Promise<EmbeddingResult>;
}
