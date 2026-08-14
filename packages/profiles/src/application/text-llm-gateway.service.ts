import {
  callOpenRouter,
  getOpenRouterApiKey,
  getTaskModelSetting,
} from "./llm-settings";
import { estimateLlmCost, type LlmCostEstimate } from "./llm-cost";
import { resolveOpenRouterPricingSnapshot } from "./openrouter-pricing.service";

export interface TextLlmGatewayInput {
  userId: string;
  householdId: string;
  taskType: string;
  system: string;
  user: string;
  modelOverride?: string | null;
  generationConfig?: Record<string, unknown> | null;
}

export interface TextLlmGatewayResult {
  content: string;
  provider: "openrouter";
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  cost: LlmCostEstimate | null;
}

export async function generateTextWithLlm(
  input: TextLlmGatewayInput,
): Promise<TextLlmGatewayResult> {
  const apiKey = await getOpenRouterApiKey(input.userId, input.householdId);
  if (!apiKey) throw new Error("LLM_PROVIDER_NOT_CONFIGURED:openrouter");
  const taskSetting = await getTaskModelSetting(
    input.userId,
    input.householdId,
    input.taskType,
  );
  const model = input.modelOverride ?? taskSetting?.modelId;
  if (!model) throw new Error(`LLM_MODEL_NOT_CONFIGURED:${input.taskType}`);
  const cfg = input.generationConfig ?? {};
  const temperature =
    typeof cfg.temperature === "number"
      ? cfg.temperature
      : taskSetting?.temperature;
  const maxTokens =
    typeof cfg.maxOutputTokens === "number"
      ? cfg.maxOutputTokens
      : taskSetting?.maxOutputTokens;
  const started = Date.now();
  const result = await callOpenRouter(apiKey, {
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature,
    maxTokens,
  });
  const promptTokens = result.usage?.promptTokens ?? null;
  const completionTokens = result.usage?.completionTokens ?? null;
  const pricing = await resolveOpenRouterPricingSnapshot(result.model);
  const cost = estimateLlmCost({ promptTokens, completionTokens }, pricing);
  return {
    content: result.content,
    provider: "openrouter",
    model: result.model,
    promptTokens,
    completionTokens,
    totalTokens: result.usage?.totalTokens ?? null,
    latencyMs: Date.now() - started,
    cost,
  };
}
