import "server-only";
import type { TextGenerationProvider, TextGenerationRequest, TextGenerationResult } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function parseJson(value: string): unknown | null {
  try { return JSON.parse(value); } catch { return null; }
}

export class OpenRouterTextGenerationProvider implements TextGenerationProvider {
  readonly id = "openrouter";

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
    const model = request.model?.trim();
    if (!model) throw new Error("Prompt version must define a model");

    const startedAt = performance.now();
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }], ...request.generationConfig }),
      cache: "no-store",
    });
    const payload = await response.json() as { error?: { message?: string }; model?: string; choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number } };
    if (!response.ok) throw new Error(payload.error?.message || `OpenRouter request failed (${response.status})`);
    const output = payload.choices?.[0]?.message?.content ?? "";
    return { output, parsedJson: parseJson(output), provider: this.id, model: payload.model ?? model, usage: { inputTokens: payload.usage?.prompt_tokens ?? null, outputTokens: payload.usage?.completion_tokens ?? null, totalTokens: payload.usage?.total_tokens ?? null }, latencyMs: Math.round(performance.now() - startedAt), estimatedCostUsd: typeof payload.usage?.cost === "number" ? payload.usage.cost : null };
  }
}
