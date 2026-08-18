import type {
  ContextManifest,
  StoryGenerationContextComposer,
} from "@lumi/context";

import {
  normalizeStoryContinuityContext,
  type StoryContinuityContextPort,
} from "./story-continuity-context";
import {
  resolveStoryNarrativeTarget,
  type StoryNarrativeTarget,
} from "./story-length-policy";
import { renderGenerationContext } from "./story-scene-prompt";
import {
  parseAndValidateSceneOutput,
  type GeneratedScene,
} from "./story-scene-output";
import {
  LlmConfigError,
  LlmGenerationError,
  type StorySceneLlmSettingsPort,
} from "./story-scene-llm-settings";
import {
  telemetryFromResponse,
  type OpenRouterCallInput,
  type OpenRouterCallResult,
  type OpenRouterCaller,
  type StoryProviderTelemetry,
} from "./story-scene-generation.service";

export type AdventureSourceFamily =
  | "world_event"
  | "rumor"
  | "inventory_item"
  | "npc_call";

export interface StoryAdventureGenerationInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  characterId?: string | null;
  storySessionId: string;
  sourceFamily: AdventureSourceFamily;
  sourceTitle: string;
  sourceTeaser?: string | null;
  sourceNpcIds?: string[];
  settingsPort: StorySceneLlmSettingsPort;
  continuityPort?: StoryContinuityContextPort;
  contextComposer?: StoryGenerationContextComposer;
  narrativeTarget?: StoryNarrativeTarget;
  callOpenRouter?: OpenRouterCaller;
  maxAttempts?: number;
}

export interface StoryAdventureGenerationResult {
  scene: GeneratedScene;
  modelId: string | null;
  attempt: number;
  narrativeTarget: StoryNarrativeTarget;
  providerRequest: OpenRouterCallInput;
  providerTelemetry: StoryProviderTelemetry;
  contextManifest: ContextManifest | null;
}

/**
 * Generates one complete short adventure from a real child-facing adventure
 * source. It shares the production settings, provider, continuity and Context
 * Builder boundaries with hook generation without fabricating an NPC hook for
 * world or inventory sources.
 */
export class StoryAdventureGenerationService {
  async generateAdventure(
    input: StoryAdventureGenerationInput,
  ): Promise<StoryAdventureGenerationResult> {
    const maxAttempts = input.maxAttempts ?? 3;
    const narrativeTarget =
      input.narrativeTarget ?? resolveStoryNarrativeTarget();
    const settings = await input.settingsPort.resolveSettings();
    const continuity = input.continuityPort
      ? normalizeStoryContinuityContext(
          await input.continuityPort.resolveContext({
            householdId: input.householdId,
            worldId: input.worldId,
            childProfileId: input.childProfileId,
            characterId: input.characterId ?? null,
            npcIds: [...new Set(input.sourceNpcIds ?? [])],
          }),
        )
      : null;
    const allowedContinuityKeys = new Set(
      continuity?.facts.map((fact) => fact.key) ?? [],
    );
    const generationContext = input.contextComposer
      ? await input.contextComposer.build({
          householdId: input.householdId,
          childProfileId: input.childProfileId,
          worldId: input.worldId,
          storySessionId: input.storySessionId,
          focalCharacterId: input.characterId ?? undefined,
          sceneFocus: [input.sourceTitle, input.sourceTeaser]
            .filter(Boolean)
            .join(" — "),
          snapshot: {
            adventureStart: {
              sourceFamily: input.sourceFamily,
              sourceTitle: input.sourceTitle,
              sourceTeaser: input.sourceTeaser ?? null,
            },
          },
        })
      : null;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const prompt = buildAdventurePrompt({
        sourceFamily: input.sourceFamily,
        sourceTitle: input.sourceTitle,
        sourceTeaser: input.sourceTeaser ?? "",
        contentBoundary: settings.contentBoundary,
        ageBand: settings.ageBand,
        locale: settings.locale,
        generationNonce: crypto.randomUUID(),
        narrativeTarget,
        continuity,
        generationContext,
      });
      const providerRequest: OpenRouterCallInput = {
        model: settings.modelId,
        messages: [
          {
            role: "system",
            content:
              "Sen çocuklar için güvenli, tutarlı ve yaşayan dünya bağlamına sadık kısa hikâyeler üreten yaratıcı bir asistansın. Sadece geçerli JSON döndür.",
          },
          { role: "user", content: prompt },
        ],
        temperature: settings.temperature,
        maxTokens: settings.maxOutputTokens,
      };

      let response: OpenRouterCallResult;
      try {
        response = await this.callProvider(
          input,
          settings.apiKey,
          providerRequest,
        );
      } catch (error) {
        if (error instanceof LlmConfigError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new LlmGenerationError(
          `Story adventure LLM call failed: ${message}`,
        );
      }

      const parsed = parseAndValidateSceneOutput(response.content);
      if (!parsed.scene) {
        lastError = new LlmGenerationError(
          `Story adventure output validation failed: ${parsed.errors.join("; ")}`,
        );
        continue;
      }

      const invalidContinuityKeys = (
        parsed.scene.usedContinuityKeys ?? []
      ).filter((key) => !allowedContinuityKeys.has(key));
      if (invalidContinuityKeys.length > 0) {
        lastError = new LlmGenerationError(
          `Story adventure continuity validation failed: unknown keys ${invalidContinuityKeys.join(", ")}`,
        );
        continue;
      }

      const narrativeLength = parsed.scene.narrative.length;
      if (
        narrativeLength < narrativeTarget.minCharacters ||
        narrativeLength > narrativeTarget.maxCharacters
      ) {
        lastError = new LlmGenerationError(
          `Story adventure narrative length must be ${narrativeTarget.minCharacters}-${narrativeTarget.maxCharacters} characters; got ${narrativeLength}`,
        );
        continue;
      }

      return {
        scene: parsed.scene,
        modelId: response.model || null,
        attempt,
        narrativeTarget,
        providerRequest,
        providerTelemetry: telemetryFromResponse(response),
        contextManifest: generationContext,
      };
    }

    throw (
      lastError ?? new LlmGenerationError("Story adventure generation failed")
    );
  }

  private async callProvider(
    input: StoryAdventureGenerationInput,
    apiKey: string,
    callInput: OpenRouterCallInput,
  ): Promise<OpenRouterCallResult> {
    if (!input.callOpenRouter) {
      throw new LlmConfigError(
        "LLM_KEY_MISSING",
        "Story adventure LLM caller is not configured.",
      );
    }
    return input.callOpenRouter(apiKey, callInput);
  }
}

function buildAdventurePrompt(input: {
  sourceFamily: AdventureSourceFamily;
  sourceTitle: string;
  sourceTeaser: string;
  contentBoundary: string;
  ageBand: string;
  locale: string;
  generationNonce: string;
  narrativeTarget: StoryNarrativeTarget;
  continuity: ReturnType<typeof normalizeStoryContinuityContext> | null;
  generationContext: ContextManifest | null;
}): string {
  const continuityLines =
    input.continuity?.facts
      .map((fact) => `- [${fact.key}] ${fact.summary}`)
      .join("\n") ?? "";
  const continuitySection = continuityLines
    ? `\nKanonik süreklilik bilgileri:\n${continuityLines}\n\nSahnede gerçekten kullandığın maddelerin anahtarlarını usedContinuityKeys alanında döndür. Kullanmadıklarını yazma.\n`
    : "\nBu istekte kanonik süreklilik maddesi yok; usedContinuityKeys boş dizi olmalı.\n";

  return `Project LUMI için tek oturumda okunup tamamlanabilen kısa bir çocuk hikâyesi üret.

Macera başlangıcı:
- Kaynak türü: ${input.sourceFamily}
- Başlık: ${input.sourceTitle}
- İpucu: ${input.sourceTeaser || "Dünyadaki mevcut bağlamdan doğal bir başlangıç oluştur."}

Zorunlu kurallar:
- Dil: Türkçe (${input.locale}).
- Yaş grubu: ${input.ageBand}; ayrıca aşağıdaki kanonik Context içindeki exact yaş bilgisini varsa dikkate al.
- İçerik sınırı: ${input.contentBoundary}.
- Hikâye anlatımı narrative alanında ${input.narrativeTarget.minCharacters}-${input.narrativeTarget.maxCharacters} karakter arasında OLMALI.
- Hikâye tek başına anlamlı bir başlangıç, gelişme ve yumuşak sonuç içermeli.
- Çocuğu korkutacak şiddet, yetişkin tema veya yoğun tehdit kullanma.
- Dünya, karakter, item ve NPC sürekliliğiyle çelişme.
- Kaynak item/rumor/world event/NPC call hikâyenin gerçek nedeni olarak hissedilmeli.
- Sadece geçerli JSON döndür; açıklama veya markdown ekleme.
- Generation nonce: ${input.generationNonce}
${renderGenerationContext(input.generationContext)}${continuitySection}
JSON şeması:
{
  "sceneId": "kısa ve kararlı slug",
  "setting": "güvenli sahne konumu",
  "characters": ["hikâyede yer alan karakter adları"],
  "narrative": "${input.narrativeTarget.minCharacters}-${input.narrativeTarget.maxCharacters} karakterlik tam hikâye",
  "moment": "hikâyenin duygusal sonucunu tek cümlede anlat",
  "nextPrompt": null,
  "usedContinuityKeys": ["yalnız gerçekten kullanılan kanonik anahtarlar"]
}`;
}
