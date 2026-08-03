function getOpenRouterBaseUrl(): string {
  return process.env["OPENROUTER_API_BASE_URL"] ?? "https://openrouter.ai/api/v1";
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequestOptions {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}



export interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage: OpenRouterUsage | null;
}

export interface OpenRouterError {
  error: {
    code: string;
    message: string;
  };
}

export async function callOpenRouter(
  apiKey: string,
  options: OpenRouterRequestOptions,
): Promise<OpenRouterResponse> {
  const { model, messages, temperature, maxTokens, signal } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;

  const fetchSignal = signal ?? null as AbortSignal | null;
  const response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lumi.app",
      "X-Title": "Project LUMI",
    },
    body: JSON.stringify(body),
    signal: fetchSignal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed: OpenRouterError | null = null;
    try {
      parsed = JSON.parse(errorBody) as OpenRouterError;
    } catch {
      // not json
    }
    const errMsg = parsed?.error?.message ?? errorBody ?? "Unknown OpenRouter error";
    throw new Error(`OpenRouter API error (${response.status}): ${errMsg}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      }
    : null;

  if (usage) {
    console.warn(
      `[OpenRouter] model=${data.model} prompt_tokens=${usage.promptTokens} completion_tokens=${usage.completionTokens} total_tokens=${usage.totalTokens}`,
    );
  }

  return {
    content,
    model: data.model,
    usage,
  };
}
