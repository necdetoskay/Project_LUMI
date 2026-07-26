import type {
  AiGenerationInput,
  AiGenerationResult,
  AiTextProvider,
} from "./provider.types";
import { AiProviderError } from "./provider-error";

export class OpenRouterTextProvider
  implements AiTextProvider
{
  readonly providerCode = "openrouter";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl =
      "https://openrouter.ai/api/v1",
  ) {}

  async generateStructured<T>(
    input: AiGenerationInput,
  ): Promise<AiGenerationResult<T>> {
    const startedAt = Date.now();

    const response = await fetch(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxOutputTokens,
          messages: [
            ...(input.systemPrompt
              ? [
                  {
                    role: "system",
                    content: input.systemPrompt,
                  },
                ]
              : []),
            {
              role: "user",
              content: input.userPrompt,
            },
          ],
          response_format: input.responseSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: "lumi_story",
                  schema: input.responseSchema,
                },
              }
            : undefined,
        }),
      },
    );

    if (!response.ok) {
      const payload = await response
        .json()
        .catch(() => ({}));

      throw new AiProviderError(
        "OpenRouter generation failed",
        this.providerCode,
        String(payload?.error?.code ?? response.status),
        response.status >= 500 || response.status === 429,
        response.status,
        payload,
      );
    }

    const payload = await response.json();
    const content =
      payload?.choices?.[0]?.message?.content;

    if (!content) {
      throw new AiProviderError(
        "Provider returned empty output",
        this.providerCode,
        "EMPTY_OUTPUT",
        true,
      );
    }

    return {
      providerRequestId: payload.id,
      model: payload.model ?? input.model,
      output: JSON.parse(content) as T,
      usage: {
        inputTokens:
          payload.usage?.prompt_tokens ?? 0,
        outputTokens:
          payload.usage?.completion_tokens ?? 0,
        cachedInputTokens:
          payload.usage?.prompt_tokens_details
            ?.cached_tokens ?? 0,
        reasoningTokens:
          payload.usage?.completion_tokens_details
            ?.reasoning_tokens ?? 0,
      },
      latencyMs: Date.now() - startedAt,
      rawMetadata: {
        provider: this.providerCode,
      },
    };
  }
}
