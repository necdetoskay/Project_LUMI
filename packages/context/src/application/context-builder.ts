import { createHash } from "node:crypto";

import { z } from "zod";

import {
  ensureParentPolicyDoesNotLoosenSafety,
  DEFAULT_SAFETY_BASELINE,
} from "../policy";
import type {
  ContextFinding,
  ContextItem,
  ContextManifest,
  ContextRequest,
  ContextSection,
  ContextSourceResult,
  EmotionalStateItem,
  KnowledgeItem,
  LongTermMemoryItem,
  OriginPackageItem,
  ParentPolicyItem,
  ParentPolicySource,
  SafetyPolicyItem,
  SafetyPolicySource,
  WorkingStoryItem,
  WorkingStorySource,
  EmotionalStateSource,
  LongTermMemorySource,
  RelevantNpcSource,
  KnowledgeSource,
  WorldSource,
  WorldItem,
  OriginPackageSource,
  TokenBudget,
  TokenUsage,
} from "../ports";

export interface ContextBuilderDeps {
  safetyPolicySource: SafetyPolicySource;
  parentPolicySource: ParentPolicySource;
  workingStorySource: WorkingStorySource;
  emotionalStateSource: EmotionalStateSource;
  longTermMemorySource: LongTermMemorySource;
  relevantNpcSource?: RelevantNpcSource;
  knowledgeSource: KnowledgeSource;
  worldSource: WorldSource;
  originPackageSource?: OriginPackageSource;
}

const contextRequestSchema = z.object({
  householdId: z.string().min(1),
  childProfileId: z.string().min(1),
  worldId: z.string().min(1),
  storySessionId: z.string().optional(),
  generationIntent: z.string().min(1),
  sceneFocus: z.string().optional(),
  focalCharacterId: z.string().optional(),
  snapshot: z.record(z.string(), z.unknown()).optional(),
});

const tokenBudgetSchema = z.object({
  totalTokens: z.number().int().nonnegative(),
  safetyTokens: z.number().int().nonnegative(),
  parentPolicyTokens: z.number().int().nonnegative(),
  workingStoryTokens: z.number().int().nonnegative(),
  emotionalStateTokens: z.number().int().nonnegative(),
  longTermMemoryTokens: z.number().int().nonnegative(),
  relevantNpcTokens: z.number().int().nonnegative().optional(),
  knowledgeTokens: z.number().int().nonnegative(),
  worldTokens: z.number().int().nonnegative(),
  originPackageTokens: z.number().int().nonnegative().optional(),
});

export function createDefaultTokenBudget(totalTokens: number): TokenBudget {
  const safeTotal = Math.max(0, totalTokens);
  return {
    totalTokens: safeTotal,
    safetyTokens: Math.floor(safeTotal * 0.2),
    parentPolicyTokens: Math.floor(safeTotal * 0.1),
    workingStoryTokens: Math.floor(safeTotal * 0.3),
    emotionalStateTokens: Math.floor(safeTotal * 0.1),
    longTermMemoryTokens: Math.floor(safeTotal * 0.1),
    knowledgeTokens: Math.floor(safeTotal * 0.1),
    worldTokens: Math.floor(safeTotal * 0.1),
  };
}

export class ContextBuilder {
  constructor(
    private readonly deps: ContextBuilderDeps,
    private readonly budget: TokenBudget,
  ) {}

  async build(request: ContextRequest): Promise<ContextManifest> {
    const validatedRequest = contextRequestSchema.parse(request);
    const validatedBudget = tokenBudgetSchema.parse(this.budget);

    const findings: ContextFinding[] = [];

    const [safetyResult, parentResult] = await Promise.all([
      this.safeFetch(
        "safety",
        () => this.deps.safetyPolicySource.fetch(validatedRequest),
        findings,
      ),
      this.safeFetch(
        "parent-policy",
        () => this.deps.parentPolicySource.fetch(validatedRequest),
        findings,
      ),
    ]);

    const safetyItem = safetyResult.items[0]?.content;
    const parentItem = parentResult.items[0]?.content;

    if (safetyItem === undefined) {
      findings.push({
        code: "MISSING_SAFETY_POLICY",
        message: "No safety policy available; applying default baseline",
        severity: "warning",
        section: "safety",
      });
    }

    if (parentItem === undefined) {
      findings.push({
        code: "MISSING_PARENT_POLICY",
        message: "No parent policy available; context may be incomplete",
        severity: "warning",
        section: "parent-policy",
      });
    }

    const guardedParent =
      parentItem !== undefined
        ? ensureParentPolicyDoesNotLoosenSafety(
            parentItem,
            DEFAULT_SAFETY_BASELINE,
          )
        : undefined;

    if (guardedParent !== undefined && !guardedParent.allowed) {
      for (const violation of guardedParent.violations) {
        findings.push({
          code: violation.code,
          message: violation.message,
          severity: "warning",
          section: "parent-policy",
        });
      }
    }

    const effectiveParentPolicy = guardedParent?.sanitizedPolicy ?? parentItem;

    const [
      workingStoryResult,
      emotionalResult,
      memoryResult,
      relevantNpcResult,
      knowledgeResult,
      worldResult,
      originResult,
    ] = await Promise.all([
      this.safeFetch(
        "working-story",
        () => this.deps.workingStorySource.fetch(validatedRequest),
        findings,
      ),
      this.safeFetch(
        "emotional-state",
        () => this.deps.emotionalStateSource.fetch(validatedRequest),
        findings,
      ),
      this.safeFetch(
        "long-term-memory",
        () => this.deps.longTermMemorySource.fetch(validatedRequest),
        findings,
      ),
      this.deps.relevantNpcSource
        ? this.safeFetch(
            "relevant-npc",
            () => this.deps.relevantNpcSource!.fetch(validatedRequest),
            findings,
          )
        : Promise.resolve({ items: [], sourceRelevance: 0 }),
      this.safeFetch(
        "knowledge",
        () => this.deps.knowledgeSource.fetch(validatedRequest),
        findings,
      ),
      this.safeFetch(
        "world",
        () => this.deps.worldSource.fetch(validatedRequest),
        findings,
      ),
      this.deps.originPackageSource
        ? this.safeFetch(
            "origin-package",
            () => this.deps.originPackageSource!.fetch(validatedRequest),
            findings,
          )
        : Promise.resolve({ items: [], sourceRelevance: 0 }),
    ]);

    const sectionConfigs: Array<{
      name: string;
      priority: number;
      budget: number;
      result: { items: ContextItem[]; sourceRelevance: number };
    }> = [
      {
        name: "safety",
        priority: 0,
        budget: validatedBudget.safetyTokens,
        result: safetyResult,
      },
      {
        name: "parent-policy",
        priority: 1,
        budget: validatedBudget.parentPolicyTokens,
        result: {
          items: effectiveParentPolicy
            ? [parentPolicyToItem(effectiveParentPolicy)]
            : [],
          sourceRelevance: parentResult.sourceRelevance,
        },
      },
      {
        name: "working-story",
        priority: 2,
        budget: validatedBudget.workingStoryTokens,
        result: workingStoryResult,
      },
      {
        name: "emotional-state",
        priority: 3,
        budget: validatedBudget.emotionalStateTokens,
        result: emotionalResult,
      },
      {
        name: "long-term-memory",
        priority: 4,
        budget: validatedBudget.longTermMemoryTokens,
        result: memoryResult,
      },
      {
        name: "relevant-npc",
        priority: 5,
        budget: validatedBudget.relevantNpcTokens ?? 0,
        result: relevantNpcResult,
      },
      {
        name: "knowledge",
        priority: 6,
        budget: validatedBudget.knowledgeTokens,
        result: knowledgeResult,
      },
      {
        name: "world",
        priority: 7,
        budget: validatedBudget.worldTokens,
        result: worldResult,
      },
      {
        name: "origin-package",
        priority: 8,
        budget: validatedBudget.originPackageTokens ?? 0,
        result: originResult,
      },
    ];

    const sections: ContextSection[] = [];
    for (const config of sectionConfigs) {
      const section = this.buildSection(
        config.name,
        config.priority,
        config.budget,
        config.result.items,
      );
      sections.push(section);
      if (section.truncated) {
        findings.push({
          code: "SECTION_TRUNCATED",
          message: `${config.name} section truncated to fit token budget`,
          severity: "warning",
          section: config.name,
        });
      }
    }

    const tokenUsage = this.computeTokenUsage(validatedBudget, sections);
    const contentHash = computeContentHash(
      validatedRequest,
      validatedBudget,
      sections,
    );

    return {
      request: validatedRequest,
      sections,
      tokenUsage,
      findings,
      contentHash,
    };
  }

  private async safeFetch<T>(
    section: string,
    fetcher: () => Promise<ContextSourceResult<T>>,
    findings: ContextFinding[],
  ): Promise<ContextSourceResult<T>> {
    try {
      return await fetcher();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      findings.push({
        code: "SOURCE_FETCH_FAILED",
        message: `Source ${section} failed: ${message}`,
        severity: "warning",
        section,
      });
      return { items: [], sourceRelevance: 0 };
    }
  }

  private buildSection(
    name: string,
    priority: number,
    budget: number,
    items: ContextItem[],
  ): ContextSection {
    const sorted = sortItems(items);
    const selected: ContextItem[] = [];
    let tokensUsed = 0;

    for (const item of sorted) {
      const itemTokens = estimateTokens(item.text);
      if (tokensUsed + itemTokens <= budget) {
        selected.push(item);
        tokensUsed += itemTokens;
      }
    }

    return {
      name,
      priority,
      items: selected,
      tokensUsed,
      truncated: selected.length < sorted.length,
    };
  }

  private computeTokenUsage(
    budget: TokenBudget,
    sections: ContextSection[],
  ): TokenUsage {
    const allocatedTokens =
      budget.safetyTokens +
      budget.parentPolicyTokens +
      budget.workingStoryTokens +
      budget.emotionalStateTokens +
      budget.longTermMemoryTokens +
      (budget.relevantNpcTokens ?? 0) +
      budget.knowledgeTokens +
      budget.worldTokens +
      (budget.originPackageTokens ?? 0);

    const usedTokens = sections.reduce(
      (sum, section) => sum + section.tokensUsed,
      0,
    );

    return {
      totalTokens: budget.totalTokens,
      allocatedTokens,
      usedTokens,
      remainingTokens: Math.max(0, budget.totalTokens - usedTokens),
    };
  }
}

function parentPolicyToItem(
  policy: ParentPolicyItem,
): ContextItem<ParentPolicyItem> {
  return {
    id: `parent-policy:${policy.householdId}`,
    type: "parent-policy",
    content: policy,
    text: [
      `contentBoundary: ${policy.contentBoundary}`,
      `maxDailyStories: ${policy.maxDailyStories}`,
      `requireParentApprovalForAi: ${policy.requireParentApprovalForAi}`,
      `allowImageGeneration: ${policy.allowImageGeneration}`,
      `allowTts: ${policy.allowTts}`,
      `forbiddenThemes: ${policy.forbiddenThemes.join(", ")}`,
    ].join("\n"),
    sourceEngine: "parent-policy",
    authority: 0.95,
    confidence: 1,
    scope: "narrative_instruction",
    priority: 1,
    relevance: 1,
  };
}

function sortItems(items: ContextItem[]): ContextItem[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.relevance !== b.relevance) {
      return b.relevance - a.relevance;
    }
    return a.id.localeCompare(b.id);
  });
}

export function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/).length;
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
  }
  return "undefined";
}

function computeContentHash(
  request: ContextRequest,
  budget: TokenBudget,
  sections: ContextSection[],
): string {
  const payload = {
    request,
    budget,
    sections: sections.map((section) => ({
      name: section.name,
      priority: section.priority,
      items: section.items.map((item) => ({
        id: item.id,
        type: item.type,
        text: item.text,
        sourceEngine: item.sourceEngine,
        authority: item.authority,
        confidence: item.confidence,
        scope: item.scope,
        priority: item.priority,
        relevance: item.relevance,
      })),
      tokensUsed: section.tokensUsed,
      truncated: section.truncated,
    })),
  };

  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

export function safetyPolicyToItem(
  policy: SafetyPolicyItem,
): ContextItem<SafetyPolicyItem> {
  return {
    id: "safety:baseline",
    type: "safety-policy",
    content: policy,
    text: policy.rules.join("\n"),
    sourceEngine: "safety-policy",
    authority: 1,
    confidence: 1,
    scope: "narrative_instruction",
    priority: 0,
    relevance: 1,
  };
}

export function workingStoryToItems(
  story: WorkingStoryItem,
): ContextItem<WorkingStoryItem>[] {
  return [
    {
      id: "working-story:mode",
      type: "working-story-mode",
      content: story,
      text: `Mode: ${story.mode}\nScene goal: ${story.sceneGoal}\nTone: ${story.tone}`,
      sourceEngine: "working-story",
      authority: 0.9,
      confidence: 1,
      scope: "narrative_instruction",
      priority: 1,
      relevance: 1,
    },
    {
      id: "working-story:facts",
      type: "working-story-facts",
      content: story,
      text: story.worldFacts.join("\n"),
      sourceEngine: "working-story",
      authority: 0.95,
      confidence: 1,
      scope: "world_truth",
      priority: 1,
      relevance: 0.95,
    },
    ...story.activeCharacterContexts.map(
      (character): ContextItem<WorkingStoryItem> => ({
        id: `working-story:character:${character.characterId}`,
        type: "working-story-character",
        content: story,
        text: [
          `Character: ${character.characterId}`,
          `Current state: ${character.currentState.join("; ")}`,
          `Active goal: ${character.activeGoal}`,
          `Relevant memories: ${character.relevantMemories.join("; ")}`,
          `Relationship notes: ${character.relationshipNotes.join("; ")}`,
          `Belief notes: ${character.beliefNotes.join("; ")}`,
          `Behavior guidance: ${character.behaviorGuidance.join("; ")}`,
        ].join("\n"),
        sourceEngine: "working-story",
        authority: 0.85,
        confidence: 0.95,
        scope: "character_belief",
        priority: 2,
        relevance: 0.9,
      }),
    ),
    {
      id: "working-story:constraints",
      type: "working-story-constraints",
      content: story,
      text: [
        `Must include: ${story.mustInclude.join("; ")}`,
        `Must not include: ${story.mustNotInclude.join("; ")}`,
        `Fixed decisions: ${story.fixedDecisions.join("; ")}`,
        `Pending events: ${story.pendingEvents.join("; ")}`,
      ].join("\n"),
      sourceEngine: "working-story",
      authority: 0.9,
      confidence: 1,
      scope: "narrative_instruction",
      priority: 1,
      relevance: 0.95,
    },
  ];
}

export function emotionalStateToItems(
  state: EmotionalStateItem,
): ContextItem<EmotionalStateItem>[] {
  return [
    {
      id: `emotional-state:${state.characterId}`,
      type: "emotional-state",
      content: state,
      text: [
        `Character: ${state.characterId}`,
        `Dominant emotions: ${state.dominantEmotions.join("; ")}`,
        `Behavior guidance: ${state.behaviorGuidance.join("; ")}`,
        `Arousal: ${state.arousal}`,
      ].join("\n"),
      sourceEngine: "emotional-state",
      authority: 0.8,
      confidence: 0.85,
      scope: "character_belief",
      priority: 2,
      relevance: 0.85,
    },
  ];
}

export function longTermMemoryToItems(
  memory: LongTermMemoryItem,
): ContextItem<LongTermMemoryItem>[] {
  return [
    {
      id: `long-term-memory:${memory.memoryId}`,
      type: "long-term-memory",
      content: memory,
      text: [
        `Memory: ${memory.summary}`,
        `Characters involved: ${memory.charactersInvolved.join(", ")}`,
        `Emotional weight: ${memory.emotionalWeight}`,
      ].join("\n"),
      sourceEngine: "long-term-memory",
      authority: 0.75,
      confidence: 0.8,
      scope: "character_belief",
      priority: 3,
      relevance: memory.emotionalWeight,
    },
  ];
}

export function knowledgeToItems(
  knowledge: KnowledgeItem,
): ContextItem<KnowledgeItem>[] {
  return [
    {
      id: "knowledge:known",
      type: "knowledge-known",
      content: knowledge,
      text: `Known facts: ${knowledge.knownFacts.join("; ")}`,
      sourceEngine: "knowledge",
      authority: 0.9,
      confidence: 0.95,
      scope: "player_knowledge",
      priority: 2,
      relevance: 0.9,
    },
    {
      id: "knowledge:suspected",
      type: "knowledge-suspected",
      content: knowledge,
      text: `Suspected facts: ${knowledge.suspectedFacts.join("; ")}`,
      sourceEngine: "knowledge",
      authority: 0.7,
      confidence: 0.6,
      scope: "player_knowledge",
      priority: 3,
      relevance: 0.6,
    },
    {
      id: "knowledge:hidden",
      type: "knowledge-hidden",
      content: knowledge,
      text: `Hidden truths: ${knowledge.hiddenTruths.join("; ")}`,
      sourceEngine: "knowledge",
      authority: 1,
      confidence: 1,
      scope: "narrative_instruction",
      priority: 0,
      relevance: 1,
    },
  ];
}

export function worldToItems(world: WorldItem): ContextItem<WorldItem>[] {
  return [
    {
      id: "world:state",
      type: "world-state",
      content: world,
      text: [
        `Location: ${world.location}`,
        `Time of day: ${world.timeOfDay}`,
        `Weather: ${world.weather ?? "unknown"}`,
        `Active hazards: ${world.activeHazards.join("; ")}`,
        `Visible changes: ${world.visibleChanges.join("; ")}`,
        `Inaccessible areas: ${world.inaccessibleAreas.join("; ")}`,
        `World facts: ${world.worldFacts.join("; ")}`,
      ].join("\n"),
      sourceEngine: "world",
      authority: 0.95,
      confidence: 1,
      scope: "world_truth",
      priority: 1,
      relevance: 0.9,
    },
  ];
}

export function originPackageToItems(
  origin: OriginPackageItem,
): ContextItem<OriginPackageItem>[] {
  return [
    {
      id: `origin-package:${origin.originType}`,
      type: "origin-package",
      content: origin,
      text: [
        `Origin type: ${origin.originType}`,
        `Dominant vectors: ${origin.dominantVectors.join("; ")}`,
        `Starting home: ${origin.startingHome ?? "unspecified"}`,
        `Nearby NPC seeds: ${origin.nearbyNpcSeeds?.join("; ") ?? "none"}`,
        `First mystery: ${origin.firstMystery ?? "unspecified"}`,
      ].join("\n"),
      sourceEngine: "origin-package",
      authority: 0.85,
      confidence: 0.9,
      scope: "world_truth",
      priority: 2,
      relevance: 0.8,
    },
  ];
}
