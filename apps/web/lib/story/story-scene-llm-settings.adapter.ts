import {
  LlmConfigError,
  type StorySceneLlmSettings,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import {
  findChildProfileForUser,
  getLlmSettings,
  getOpenRouterApiKey,
  getPolicy,
} from "@lumi/profiles/application";

export interface StorySceneLlmSettingsAdapterScope {
  userId: string;
  householdId: string;
  childProfileId: string;
}

export class WebStorySceneLlmSettingsAdapter
  implements StorySceneLlmSettingsPort
{
  constructor(private readonly scope: StorySceneLlmSettingsAdapterScope) {}

  async resolveSettings(): Promise<StorySceneLlmSettings> {
    const { userId, householdId, childProfileId } = this.scope;

    const [settings, apiKey, policy, child] = await Promise.all([
      getLlmSettings(userId, householdId),
      getOpenRouterApiKey(userId, householdId),
      getPolicy(householdId, userId),
      findChildProfileForUser(childProfileId, userId, householdId),
    ]);

    if (!settings.enabled) {
      throw new LlmConfigError(
        "LLM_PROVIDER_DISABLED",
        "OpenRouter provider is disabled for this household.",
      );
    }
    if (!apiKey) {
      throw new LlmConfigError(
        "LLM_KEY_MISSING",
        "OpenRouter API key is not configured for this household.",
      );
    }

    const task = settings.taskSettings.find(
      (candidate) => candidate.taskType === "story_turn_generation",
    );
    if (!task) {
      throw new LlmConfigError(
        "LLM_TASK_MISSING",
        "Story turn generation task is not configured.",
      );
    }
    if (!task.enabled) {
      throw new LlmConfigError(
        "LLM_TASK_DISABLED",
        "Story turn generation task is disabled.",
      );
    }
    if (!policy) {
      throw new LlmConfigError(
        "LLM_TASK_MISSING",
        "Parent policy is required before story generation.",
      );
    }
    if (!child) {
      throw new LlmConfigError(
        "LLM_TASK_MISSING",
        "Child profile is not available in this household.",
      );
    }

    return {
      apiKey,
      modelId: task.modelId,
      temperature: task.temperature,
      maxOutputTokens: task.maxOutputTokens,
      contentBoundary: policy.contentBoundary,
      ageBand: child.ageBand,
      locale: child.locale ?? "tr-TR",
    };
  }
}
