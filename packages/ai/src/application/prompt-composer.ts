import { renderActivePrompt } from "@lumi/prompts";
import { SchemaValidationError } from "../domain/generation-errors";
import { buildOriginCreativeBrief } from "../domain/creative-brief";
import { createBootstrapVectors } from "../domain/bootstrap-vectors";
import type {
  PromptComposerPort,
  ComposedPrompt,
  PromptComposerInput,
} from "../ports/prompt-composer.port";

export interface RegistryPromptComposerConfig {
  defaultSystemPrompt?: string;
  defaultJsonMode?: boolean;
}

const GENERIC_SYSTEM_PROMPT =
  "You are a helpful creative writing assistant for children's stories. Respond only with valid JSON matching the requested schema.";

export class RegistryPromptComposer implements PromptComposerPort {
  private readonly defaultSystemPrompt: string;
  private readonly defaultJsonMode: boolean;

  constructor(config: RegistryPromptComposerConfig = {}) {
    this.defaultSystemPrompt =
      config.defaultSystemPrompt ?? GENERIC_SYSTEM_PROMPT;
    this.defaultJsonMode = config.defaultJsonMode ?? true;
  }

  public async compose(input: PromptComposerInput): Promise<ComposedPrompt> {
    if (input.task === "origin_candidate") {
      return this.composeOrigin(input);
    }
    return this.composeFromRegistry(input);
  }

  private async composeOrigin(
    input: PromptComposerInput,
  ): Promise<ComposedPrompt> {
    const origin = input.originGenerationInput;
    if (!origin) {
      throw new SchemaValidationError(
        "origin_candidate task requires originGenerationInput.",
      );
    }

    const vectors = createBootstrapVectors({
      universeSeed: origin.universeSeed,
      characterKind: origin.characterKind,
      childAgeBand: origin.childAgeBand,
    });

    const brief = buildOriginCreativeBrief({
      characterKind: origin.characterKind,
      characterType: origin.characterType,
      universeSeed: origin.universeSeed,
      candidateSeed: input.requestId,
      vectors,
      safetyBounds: origin.safetyBounds,
    });

    const prompt = JSON.stringify(
      {
        task: "origin_candidate",
        brief,
        candidateCount: origin.candidateCount,
        previousBatchConcepts: origin.previousBatchConcepts ?? [],
        outputSchema: {
          packages: [
            {
              id: "string",
              characterKind: "string",
              subtype: "string",
              originConcept: "string",
              startingRegionArchetype: "string",
              startingLocation: "string",
              homeArchetype: "string",
              nearbyNpcSeed: "string",
              firstMysterySeed: "string",
              toneVector: "string[]",
              noveltyMarkers: "string[]",
              universeSeed: "string",
              candidateSeed: "string",
              score: "number",
            },
          ],
        },
      },
      null,
      2,
    );

    return {
      systemPrompt: this.defaultSystemPrompt,
      prompt,
      jsonMode: this.defaultJsonMode,
    };
  }

  private async composeFromRegistry(
    input: PromptComposerInput,
  ): Promise<ComposedPrompt> {
    const rendered = await renderActivePrompt(
      input.promptKey,
      input.variables ?? {},
    );
    if (!rendered || !rendered.renderedText) {
      throw new SchemaValidationError(
        "Prompt registry returned no rendered prompt.",
      );
    }

    return {
      systemPrompt: this.defaultSystemPrompt,
      prompt: rendered.renderedText,
      jsonMode: this.defaultJsonMode,
    };
  }
}
