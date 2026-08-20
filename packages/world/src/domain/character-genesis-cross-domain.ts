import {
  buildCharacterVisibleOriginContext,
  validateCharacterGenesisStructure,
  type CharacterGenesisPackage,
  type GenesisValidationIssue,
  type GenesisValidationResult,
  type GenesisVisibility,
} from "./character-genesis";
import {
  buildEnvironmentContextProjection,
  validateGenesisEnvironment,
  type EnvironmentCompatibilityContext,
} from "./character-genesis-environment";

export interface CharacterGenesisCrossDomainValidationContext
  extends EnvironmentCompatibilityContext {
  requireCompletePackage?: boolean;
  requireSelectedForCommit?: boolean;
}

export interface CommittedGenesisStoryContextProjection {
  commit: {
    genesisPackageId: string;
    characterId: string;
    version: number;
    status: "committed";
  };
  characterState: {
    origin: ReturnType<typeof buildCharacterVisibleOriginContext>;
    dna: CharacterGenesisPackage["sections"]["traits"] extends infer T
      ? T extends { dna: infer D }
        ? D
        : never
      : never;
    contextualTraits: Array<{
      kind: string;
      context: string;
      intensity: number;
    }>;
    social: {
      npcs: Array<{ role: string; displayName: string }>;
      relationships: Array<{
        from: string;
        to: string;
        trust: number;
        affection: number;
        familiarity: number;
        respect: number;
        tension: number;
        dependence: number;
      }>;
    };
    inventory: Array<{
      displayName: string;
      category: string;
      origin: string;
      emotionalValue?: number;
      storyPotential?: number;
    }>;
  };
  worldState: ReturnType<typeof buildEnvironmentContextProjection>;
  relevantMemories: {
    memories: Array<{ summary: string }>;
    threads: Array<{ summary: string; status: string; potential: number }>;
    storyHooks: Array<{ summary: string; potential: number }>;
  };
}

const CHARACTER_VISIBLE: ReadonlySet<GenesisVisibility> = new Set([
  "user_visible",
  "known_to_character",
]);

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

function pushDuplicateIdentityIssues(
  issues: GenesisValidationIssue[],
  entries: ReadonlyArray<{ identity: string; path: string; label: string }>,
  code: string,
): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const normalized = normalizeIdentity(entry.identity);
    if (!normalized) continue;
    const previous = seen.get(normalized);
    if (previous) {
      issues.push({
        code,
        message: `${entry.label} duplicates normalized identity already used at ${previous}`,
        path: entry.path,
        severity: "error",
      });
    } else {
      seen.set(normalized, entry.path);
    }
  }
}

function visibleFactLeakIssues(
  candidate: CharacterGenesisPackage,
): GenesisValidationIssue[] {
  const origin = candidate.sections.origin;
  if (!origin) return [];
  const factById = new Map(origin.facts.map((fact) => [fact.id, fact] as const));
  const issues: GenesisValidationIssue[] = [];
  const consumers = [
    ...(candidate.sections.memoryAndThreads?.memories.map((memory) => ({
      visibility: memory.visibility,
      ids: memory.originFactIds,
      path: `sections.memoryAndThreads.memories.${memory.candidateId}`,
    })) ?? []),
    ...(candidate.sections.memoryAndThreads?.threads.map((thread) => ({
      visibility: thread.visibility,
      ids: thread.originFactIds,
      path: `sections.memoryAndThreads.threads.${thread.candidateId}`,
    })) ?? []),
  ];

  for (const consumer of consumers) {
    if (!CHARACTER_VISIBLE.has(consumer.visibility)) continue;
    for (const factId of consumer.ids) {
      const fact = factById.get(factId);
      if (fact && !CHARACTER_VISIBLE.has(fact.visibility)) {
        issues.push({
          code: "GENESIS_CHARACTER_VISIBLE_HIDDEN_FACT_LEAK",
          message: `Character-visible knowledge references hidden origin fact ${factId}`,
          path: consumer.path,
          severity: "error",
        });
      }
    }
  }
  return issues;
}

export function validateCharacterGenesisCrossDomain(
  candidate: CharacterGenesisPackage,
  context: CharacterGenesisCrossDomainValidationContext = {},
): GenesisValidationResult {
  const structural = validateCharacterGenesisStructure(candidate);
  const issues = [...structural.issues];
  const requireComplete = context.requireCompletePackage ?? true;

  if (context.requireSelectedForCommit && candidate.status !== "selected") {
    issues.push({
      code: "GENESIS_COMMIT_REQUIRES_SELECTED_PACKAGE",
      message: "Only a selected Genesis package can enter canonical commit",
      path: "status",
      severity: "error",
    });
  }

  if (requireComplete) {
    const requiredSections = [
      "origin",
      "traits",
      "social",
      "inventory",
      "memoryAndThreads",
      "environment",
    ] as const;
    for (const section of requiredSections) {
      if (!candidate.sections[section]) {
        issues.push({
          code: "GENESIS_REQUIRED_SECTION_MISSING",
          message: `Final Genesis package is missing required section ${section}`,
          path: `sections.${section}`,
          severity: "error",
        });
      }
    }
  }

  const memories = candidate.sections.memoryAndThreads?.memories ?? [];
  const threads = candidate.sections.memoryAndThreads?.threads ?? [];
  const memoryIds = new Set(memories.map((entry) => entry.candidateId));
  const threadIds = new Set(threads.map((entry) => entry.candidateId));
  if (memoryIds.size !== memories.length) {
    issues.push({
      code: "GENESIS_DUPLICATE_MEMORY",
      message: "Memory candidate ids must be unique",
      path: "sections.memoryAndThreads.memories",
      severity: "error",
    });
  }
  if (threadIds.size !== threads.length) {
    issues.push({
      code: "GENESIS_DUPLICATE_THREAD",
      message: "Thread candidate ids must be unique",
      path: "sections.memoryAndThreads.threads",
      severity: "error",
    });
  }

  pushDuplicateIdentityIssues(
    issues,
    (candidate.sections.social?.npcs ?? []).map((npc) => ({
      identity: npc.displayName,
      path: `sections.social.npcs.${npc.candidateId}`,
      label: `NPC ${npc.displayName}`,
    })),
    "GENESIS_DUPLICATE_NPC_IDENTITY",
  );
  pushDuplicateIdentityIssues(
    issues,
    (candidate.sections.inventory?.items ?? []).map((item) => ({
      identity: item.displayName,
      path: `sections.inventory.items.${item.candidateId}`,
      label: `Item ${item.displayName}`,
    })),
    "GENESIS_DUPLICATE_ITEM_IDENTITY",
  );
  pushDuplicateIdentityIssues(
    issues,
    threads.map((thread) => ({
      identity: thread.summary,
      path: `sections.memoryAndThreads.threads.${thread.candidateId}`,
      label: `Thread ${thread.summary}`,
    })),
    "GENESIS_DUPLICATE_THREAD_IDENTITY",
  );

  for (const relationship of candidate.sections.social?.relationships ?? []) {
    for (const [axis, value] of Object.entries({
      trust: relationship.trust,
      affection: relationship.affection,
      familiarity: relationship.familiarity,
      respect: relationship.respect,
      tension: relationship.tension,
      dependence: relationship.dependence,
    })) {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        issues.push({
          code: "GENESIS_RELATIONSHIP_AXIS_OUT_OF_RANGE",
          message: `Relationship ${axis} must be within [0,1]`,
          path: "sections.social.relationships",
          severity: "error",
        });
      }
    }
    if (relationship.fromCandidateId === relationship.toCandidateId) {
      issues.push({
        code: "GENESIS_RELATIONSHIP_SELF_REFERENCE",
        message: "A relationship cannot target the same identity as its source",
        path: "sections.social.relationships",
        severity: "error",
      });
    }
  }

  issues.push(...visibleFactLeakIssues(candidate));

  if (candidate.sections.environment) {
    const environmentValidation = validateGenesisEnvironment(
      candidate.sections.environment,
      context,
    );
    for (const issue of environmentValidation.issues) {
      if (
        !issues.some(
          (existing) =>
            existing.code === issue.code && existing.message === issue.message,
        )
      ) {
        issues.push({
          code: issue.code,
          message: issue.message,
          path: "sections.environment",
          severity: issue.severity,
        });
      }
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export function buildCommittedGenesisStoryContextProjection(
  candidate: CharacterGenesisPackage,
): CommittedGenesisStoryContextProjection {
  if (candidate.status !== "committed") {
    throw new Error("GENESIS_FIRST_STORY_REQUIRES_COMMITTED_PACKAGE");
  }
  const validation = validateCharacterGenesisCrossDomain(candidate, {
    requireCompletePackage: true,
  });
  if (!validation.valid) {
    throw new Error(
      `GENESIS_FIRST_STORY_INVALID_PACKAGE:${validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",")}`,
    );
  }

  const origin = candidate.sections.origin!;
  const traits = candidate.sections.traits!;
  const social = candidate.sections.social!;
  const inventory = candidate.sections.inventory!;
  const memoryAndThreads = candidate.sections.memoryAndThreads!;
  const environment = candidate.sections.environment!;
  const visibleFactIds = new Set(
    origin.facts
      .filter((fact) => CHARACTER_VISIBLE.has(fact.visibility))
      .map((fact) => fact.id),
  );

  return {
    commit: {
      genesisPackageId: candidate.id,
      characterId: candidate.characterId,
      version: candidate.version,
      status: "committed",
    },
    characterState: {
      origin: buildCharacterVisibleOriginContext(origin),
      dna: structuredClone(traits.dna),
      contextualTraits: traits.contextual.map((entry) => ({
        kind: entry.kind,
        context: entry.context,
        intensity: entry.intensity,
      })),
      social: {
        npcs: social.npcs.map((npc) => ({
          role: npc.role,
          displayName: npc.displayName,
        })),
        relationships: social.relationships.map((relationship) => ({
          from: relationship.fromCandidateId,
          to: relationship.toCandidateId,
          trust: relationship.trust,
          affection: relationship.affection,
          familiarity: relationship.familiarity,
          respect: relationship.respect,
          tension: relationship.tension,
          dependence: relationship.dependence,
        })),
      },
      inventory: inventory.items.map((item) => ({
        displayName: item.displayName,
        category: item.category,
        origin: item.origin,
        ...(item.emotionalValue !== undefined
          ? { emotionalValue: item.emotionalValue }
          : {}),
        ...(item.storyPotential !== undefined
          ? { storyPotential: item.storyPotential }
          : {}),
      })),
    },
    worldState: buildEnvironmentContextProjection(environment),
    relevantMemories: {
      memories: memoryAndThreads.memories
        .filter(
          (memory) =>
            CHARACTER_VISIBLE.has(memory.visibility) &&
            memory.originFactIds.every((id) => visibleFactIds.has(id)),
        )
        .map((memory) => ({ summary: memory.summary })),
      threads: memoryAndThreads.threads
        .filter(
          (thread) =>
            CHARACTER_VISIBLE.has(thread.visibility) &&
            thread.status !== "resolved" &&
            thread.originFactIds.every((id) => visibleFactIds.has(id)),
        )
        .sort((left, right) => right.potential - left.potential)
        .slice(0, 6)
        .map((thread) => ({
          summary: thread.summary,
          status: thread.status,
          potential: thread.potential,
        })),
      storyHooks: (origin.storyHooks ?? [])
        .filter((hook) => hook.relatedFactIds.every((id) => visibleFactIds.has(id)))
        .sort((left, right) => right.potential - left.potential)
        .slice(0, 4)
        .map((hook) => ({ summary: hook.summary, potential: hook.potential })),
    },
  };
}
