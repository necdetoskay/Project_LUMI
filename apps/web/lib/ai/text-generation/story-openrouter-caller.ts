import "server-only";

import type {
  OpenRouterCallInput,
  OpenRouterCallResult,
  OpenRouterCaller,
} from "@lumi/story";

import { generateText } from "./gateway";

/**
 * Production bridge between @lumi/story and the shared text-generation
 * gateway. Story generation still owns its model/settings contract while the
 * web runtime owns provider transport, credentials, usage accounting and
 * provider selection.
 */
export const callStoryOpenRouter: OpenRouterCaller = async (
  _apiKey: string,
  input: OpenRouterCallInput,
): Promise<OpenRouterCallResult> => {
  const systemMessages = input.messages.filter(
    (message) => message.role === "system",
  );
  const conversationMessages = input.messages.filter(
    (message) => message.role !== "system",
  );

  const system = systemMessages.map((message) => message.content).join("\n\n");
  const user = conversationMessages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const result = await generateText({
    purpose: "story_scene_generation",
    provider: "openrouter",
    model: input.model,
    system,
    user,
    generationConfig: {
      temperature: input.temperature,
      max_tokens: input.maxTokens,
    },
  });

  return {
    content: result.output,
    model: result.model,
  };
};
