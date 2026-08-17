function getOpenRouterBaseUrl(): string {
  return (
    process.env["OPENROUTER_API_BASE_URL"] ?? "https://openrouter.ai/api/v1"
  );
}

const DEFAULT_OPENROUTER_REQUEST_TIMEOUT_MS = 60_000;

function getOpenRouterRequestTimeoutMs(): number {
  const configured = process.env["OPENROUTER_REQUEST_TIMEOUT_MS"]?.trim();
  if (!configured) return DEFAULT_OPENROUTER_REQUEST_TIMEOUT_MS;

  const parsed = Number.parseInt(configured, 10);
  if (!Number.isFinite(parsed) || parsed < 1_000 || parsed > 300_000) {
    return DEFAULT_OPENROUTER_REQUEST_TIMEOUT_MS;
  }
  return parsed;
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

  const timeoutMs = getOpenRouterRequestTimeoutMs();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://lumi.app",
        "X-Title": "Project LUMI",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error(
        `OpenRouter request timed out after ${timeoutMs}ms for model ${model}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed: OpenRouterError | null = null;
    try {
      parsed = JSON.parse(errorBody) as OpenRouterError;
    } catch {
      // not json
    }
    const errMsg =
      parsed?.error?.message ?? errorBody ?? "Unknown OpenRouter error";
    throw new Error(`OpenRouter API error (${response.status}): ${errMsg}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
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
