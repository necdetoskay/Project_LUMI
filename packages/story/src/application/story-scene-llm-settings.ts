/**
 * Configuration error for story scene generation. Mirrors the origin-generator
 * `LlmConfigError` contract so the composition layer (web) can surface the same
 * settings UX; codes match `@lumi/profiles` exactly.
 */
export class LlmConfigError extends Error {
  public code:
    | "LLM_KEY_MISSING"
    | "LLM_TASK_MISSING"
    | "LLM_TASK_DISABLED"
    | "LLM_PROVIDER_DISABLED";
  constructor(code: LlmConfigError["code"], message: string) {
    super(message);
    this.name = "LlmConfigError";
    this.code = code;
  }
}

export class LlmGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmGenerationError";
  }
}

export interface StorySceneLlmSettings {
  apiKey: string;
  modelId: string;
  temperature: number;
  maxOutputTokens: number;
  contentBoundary: string;
  ageBand: string;
  locale: string;
}

/**
 * Injected boundary for LLM settings. `@lumi/story` never imports
 * `@lumi/profiles`; the web composition layer implements this port with the
 * profiles task/provider settings repos + decryption (S12 origin-generator
 * pattern) and throws `LlmConfigError` with the standard codes.
 */
export interface StorySceneLlmSettingsPort {
  resolveSettings(): Promise<StorySceneLlmSettings>;
}
