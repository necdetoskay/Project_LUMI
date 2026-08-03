import type { GenerationTask } from "../domain/generation-types";
import type {
  OriginGenerationInput,
  OriginPackageProposal,
} from "../domain/origin-types";
import type { OriginCreativeBrief } from "../domain/creative-brief";

export interface PromptComposerInput {
  task: GenerationTask;
  requestId: string;
  promptKey: string;
  variables?: Record<string, unknown>;
  creativeBrief?: OriginCreativeBrief | undefined;
  originGenerationInput?: OriginGenerationInput | undefined;
  candidate?: OriginPackageProposal | undefined;
  validationContext?: unknown;
  repairInstruction?: string | undefined;
}

export interface ComposedPrompt {
  systemPrompt: string;
  prompt: string;
  jsonMode: boolean;
}

export interface PromptComposerPort {
  compose(input: PromptComposerInput): Promise<ComposedPrompt>;
}
