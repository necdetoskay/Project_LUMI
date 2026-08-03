import type { GenerationProvider } from "./provider.port";
import type { ModelRouterPort } from "./model-router.port";
import type { PromptComposerPort } from "./prompt-composer.port";
import type { UsageRecorderPort } from "./usage.port";

export interface GenerationPorts {
  providers: Map<string, GenerationProvider>;
  modelRouter: ModelRouterPort;
  promptComposer: PromptComposerPort;
  usageRecorder: UsageRecorderPort;
}
