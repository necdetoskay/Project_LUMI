import type {
  BootstrapMaterializationRef,
  CharacterFoundationRecord,
  FoundationDerivationConfidence,
  FoundationProvenance,
  GenesisArchetype,
  SocialEcologyRole,
} from "../domain";
import { validateCharacterFoundation } from "../domain";
import type {
  CharacterFoundationRepository,
  FoundationScope,
} from "./character-foundation.repository";

const UNKNOWN_LEGACY_SAGA_TRUTH =
  "Legacy canon contains no established hidden saga truth.";
const UNKNOWN_LEGACY_FEAR =
  "Legacy canon contains no established fundamental fear.";
const UNKNOWN_LEGACY_STAKES =
  "Legacy canon contains no established long-term saga stakes.";

export type LegacyFoundationEvidence = FoundationScope & {
  premise?: string;
  currentSituation?: string;
  longTermDesire?: string;
  fundamentalNeed?: string;
  archetypes?: GenesisArchetype[];
  knownFacts?: string[];
  currentBeliefs?: string[];
  unresolvedQuestions?: string[];
  establishedSagaTruth?: string;
  fundamentalFear?: string;
  stakes?: string;
  establishedSocialEcology?: SocialEcologyRole[];
  establishedMaterializations?: BootstrapMaterializationRef[];
  priorStoryCount: number;
  ambiguous?: boolean;
  highValueProfile?: boolean;
  optOut?: boolean;
};

export type LegacyBackfillStatus =
  | "would-create"
  | "created"
  | "already-migrated"
  | "manual-review"
  | "opted-out";

export type LegacyBackfillReport = {
  scope: FoundationScope;
  status: LegacyBackfillStatus;
  dryRun: boolean;
  confidence: FoundationDerivationConfidence;
  unresolvedGaps: string[];
  reusedMaterializations: number;
  foundation?: CharacterFoundationRecord;
};

export type LegacyCharacterFoundationBackfillDeps = {
  repository: CharacterFoundationRepository;
  now?: () => Date;
};

/**
 * Backfills pre-Genesis characters without rewriting legacy canon.
 *
 * This service consumes evidence that has already been read from canonical
 * character/world/story/NPC/inventory authorities. It only persists the
 * profile-owned foundation record. Existing entities are referenced as reused
 * materializations; this service never copies or mutates legacy sessions.
 */
export class LegacyCharacterFoundationBackfillService {
  private readonly now: () => Date;

  constructor(private readonly deps: LegacyCharacterFoundationBackfillDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async backfill(
    evidence: LegacyFoundationEvidence,
    options: { dryRun?: boolean } = {},
  ): Promise<LegacyBackfillReport> {
    const existing = await this.deps.repository.findByScope(evidence);
    const unresolvedGaps = collectUnresolvedGaps(evidence);
    const confidence = classifyConfidence(evidence, unresolvedGaps);
    const dryRun = options.dryRun ?? false;

    if (existing) {
      return {
        scope: toScope(evidence),
        status: "already-migrated",
        dryRun,
        confidence,
        unresolvedGaps,
        reusedMaterializations:
          existing.bootstrapManifest?.materialized.filter((item) => item.reused)
            .length ?? 0,
        foundation: existing,
      };
    }

    if (evidence.optOut) {
      return {
        scope: toScope(evidence),
        status: "opted-out",
        dryRun,
        confidence,
        unresolvedGaps,
        reusedMaterializations: 0,
      };
    }

    if (evidence.ambiguous && evidence.highValueProfile) {
      return {
        scope: toScope(evidence),
        status: "manual-review",
        dryRun,
        confidence,
        unresolvedGaps,
        reusedMaterializations: 0,
      };
    }

    const foundation = deriveFoundation(
      evidence,
      confidence,
      unresolvedGaps,
      this.now(),
    );

    if (dryRun) {
      return {
        scope: toScope(evidence),
        status: "would-create",
        dryRun: true,
        confidence,
        unresolvedGaps,
        reusedMaterializations:
          foundation.bootstrapManifest?.materialized.length ?? 0,
        foundation,
      };
    }

    const saved = await this.deps.repository.save({
      foundation,
      expectedVersion: null,
    });

    return {
      scope: toScope(evidence),
      status: "created",
      dryRun: false,
      confidence,
      unresolvedGaps,
      reusedMaterializations: saved.bootstrapManifest?.materialized.length ?? 0,
      foundation: saved,
    };
  }
}

function deriveFoundation(
  evidence: LegacyFoundationEvidence,
  confidence: FoundationDerivationConfidence,
  unresolvedGaps: string[],
  now: Date,
): CharacterFoundationRecord {
  const scope = toScope(evidence);
  const stablePrefix = `legacy:${scope.characterId}`;
  const knownFacts = unique(evidence.knownFacts ?? []);
  const currentBeliefs = unique(evidence.currentBeliefs ?? []);
  const unresolvedQuestions = unique(evidence.unresolvedQuestions ?? []);
  const explicitTruth = clean(evidence.establishedSagaTruth);
  const archetypes: GenesisArchetype[] = evidence.archetypes?.length
    ? unique(evidence.archetypes).slice(0, 4)
    : ["rooted"];
  const provenance: FoundationProvenance = {
    generationIntent: "legacy-derived-foundation-backfill",
    promptKey: "legacy-derived:no-generation",
    promptVersion: 1,
    model: "none",
    provider: "deterministic-backfill",
    generatedAt: now,
    origin: "legacy-derived",
    confidence,
    unresolvedGaps,
  };

  const materialized = uniqueMaterializations(
    evidence.establishedMaterializations ?? [],
  ).map((item) => ({ ...item, reused: true }));

  const sagaCanonId = `${stablePrefix}:saga`;
  const foundation: CharacterFoundationRecord = {
    id: `${stablePrefix}:foundation`,
    ...scope,
    version: 1,
    genesis: {
      id: `${stablePrefix}:genesis`,
      ...scope,
      version: 1,
      archetypes,
      premise:
        clean(evidence.premise) ??
        "This character predates Genesis; established legacy canon remains authoritative.",
      currentSituation:
        clean(evidence.currentSituation) ??
        "Continue from the latest established legacy story and world state.",
      longTermDesire:
        clean(evidence.longTermDesire) ??
        "Preserve established goals until future stories canonically change them.",
      fundamentalNeed:
        clean(evidence.fundamentalNeed) ??
        "Preserve established needs until future stories canonically change them.",
      knownFacts,
      currentBeliefs,
      unknownQuestions: unresolvedQuestions,
      socialEcology: dedupeSocialEcology(
        evidence.establishedSocialEcology ?? [],
      ),
      provenance,
    },
    sagaCanon: {
      id: sagaCanonId,
      ...scope,
      version: 1,
      centralQuestion:
        unresolvedQuestions[0] ??
        "What future saga question will emerge from established canon?",
      deepTruth: explicitTruth ?? UNKNOWN_LEGACY_SAGA_TRUTH,
      longTermDesire:
        clean(evidence.longTermDesire) ??
        "Preserve established goals until future stories canonically change them.",
      fundamentalFear: clean(evidence.fundamentalFear) ?? UNKNOWN_LEGACY_FEAR,
      stakes: clean(evidence.stakes) ?? UNKNOWN_LEGACY_STAKES,
      hiddenForces: [],
      possibleTransformations: [],
      revealLayers: [],
      forbiddenEarlyReveals: explicitTruth ? [explicitTruth] : [],
      provenance,
    },
    sagaProgression: {
      sagaCanonId,
      version: 1,
      knownFacts,
      currentBeliefs,
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions,
      revealStage: 0,
      updatedAt: now,
    },
    bootstrapManifest: {
      id: `${stablePrefix}:bootstrap`,
      ...scope,
      foundationVersion: 1,
      bootstrapVersion: 1,
      idempotencyKey: `legacy-foundation-v1:${scope.characterId}`,
      status: "completed",
      materialized,
      provenance,
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  validateCharacterFoundation(foundation);
  return foundation;
}

function collectUnresolvedGaps(evidence: LegacyFoundationEvidence): string[] {
  const gaps = [...(evidence.unresolvedQuestions ?? [])];
  if (!clean(evidence.premise)) gaps.push("genesis.premise");
  if (!clean(evidence.currentSituation)) gaps.push("genesis.currentSituation");
  if (!clean(evidence.longTermDesire)) gaps.push("genesis.longTermDesire");
  if (!clean(evidence.fundamentalNeed)) gaps.push("genesis.fundamentalNeed");
  if (!clean(evidence.establishedSagaTruth)) gaps.push("saga.deepTruth");
  return unique(gaps);
}

function classifyConfidence(
  evidence: LegacyFoundationEvidence,
  gaps: string[],
): FoundationDerivationConfidence {
  if (evidence.ambiguous || gaps.length >= 5) return "low";
  const factCount =
    (evidence.knownFacts?.length ?? 0) + (evidence.currentBeliefs?.length ?? 0);
  if (evidence.priorStoryCount >= 5 && factCount >= 3 && gaps.length <= 2) {
    return "high";
  }
  return "medium";
}

function toScope(value: FoundationScope): FoundationScope {
  return {
    householdId: value.householdId,
    childProfileId: value.childProfileId,
    characterId: value.characterId,
    worldId: value.worldId,
  };
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function dedupeSocialEcology(values: SocialEcologyRole[]): SocialEcologyRole[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.targetCharacterId
      ? `${value.roleType}:${value.targetCharacterId}`
      : value.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueMaterializations(
  values: BootstrapMaterializationRef[],
): BootstrapMaterializationRef[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.kind}:${value.authority}:${value.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
